import shutil
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query, Response
from fastapi.responses import FileResponse, HTMLResponse, PlainTextResponse
import numpy as np

from app.config import settings
from app.schemas.project import (
    Project,
    ProjectCreateRequest,
    CalibrationRequest,
    MeasureRequest,
    Measurement,
    ExplainTerrainResponse
)
from app.storage.project_store import project_store
from app.services.project_service import project_service
from app.services.mesh_service import mesh_service
from app.services.report_service import report_service

router = APIRouter()

@router.get("/projects", response_model=List[Project])
def list_projects():
    return project_store.list_all()

@router.post("/projects", response_model=Project)
def create_project(req: ProjectCreateRequest):
    return project_service.create_project(name=req.name, reconstruction_mode=req.reconstruction_mode or "relative")

@router.get("/projects/{project_id}", response_model=Project)
def get_project(project_id: str):
    p = project_store.get(project_id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return p

@router.delete("/projects/{project_id}")
def delete_project(project_id: str):
    success = project_store.delete(project_id)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project deleted successfully"}

@router.post("/projects/{project_id}/upload")
async def upload_file(
    project_id: str,
    file: UploadFile = File(...),
    preferred_mode: str = Form("relative"),
    invert_depth: bool = Form(False),
    normalize_depth: bool = Form(True)
):
    project = project_store.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Validate file extension
    suffix = Path(file.filename).suffix.lower()
    allowed = [".jpg", ".jpeg", ".png", ".tif", ".tiff"]
    if suffix not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format '{suffix}'. Supported formats: JPG, PNG, TIFF, GeoTIFF."
        )

    # Save uploaded file
    pdir = settings.PROJECTS_DIR / project_id
    pdir.mkdir(parents=True, exist_ok=True)
    temp_upload = pdir / f"upload_{file.filename}"
    
    with open(temp_upload, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        updated = project_service.process_uploaded_image(
            project_id=project_id,
            image_path=temp_upload,
            preferred_mode=preferred_mode,
            invert_depth=invert_depth,
            normalize_depth=normalize_depth
        )
        return updated
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@router.post("/projects/{project_id}/process")
def reprocess_project(
    project_id: str,
    invert_depth: bool = False,
    normalize_depth: bool = True
):
    project = project_store.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    pdir = settings.PROJECTS_DIR / project_id
    orig_file = pdir / "original.png"
    if not orig_file.exists():
        raise HTTPException(status_code=400, detail="No source image uploaded yet")

    return project_service.process_uploaded_image(
        project_id=project_id,
        image_path=orig_file,
        preferred_mode=project.reconstruction_mode,
        invert_depth=invert_depth,
        normalize_depth=normalize_depth
    )

@router.get("/projects/{project_id}/status")
def get_project_status(project_id: str):
    p = project_store.get(project_id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return {
        "status": p.status,
        "progress": p.progress,
        "current_step": p.current_step,
        "pipeline_steps": p.pipeline_steps
    }

@router.get("/projects/{project_id}/mesh")
def get_project_mesh_data(project_id: str, grid_size: int = Query(128, ge=32, le=256)):
    p = project_store.get(project_id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    pdir = settings.PROJECTS_DIR / project_id
    dsm_file = pdir / "dsm.npy"
    if not dsm_file.exists():
        raise HTTPException(status_code=404, detail="DSM not generated yet")
    
    elevation_grid = np.load(dsm_file)
    heightfield = mesh_service.export_heightfield_json(elevation_grid, target_grid_size=grid_size)
    heightfield["is_metric"] = p.terrain_stats.is_metric if p.terrain_stats else False
    heightfield["elevation_unit"] = p.terrain_stats.elevation_unit if p.terrain_stats else "relative units"
    return heightfield

@router.post("/projects/{project_id}/calibrate")
def calibrate_elevation(project_id: str, req: CalibrationRequest):
    if req.method == "gcp" and req.gcp_points:
        return project_service.calibrate_gcp(project_id, req.gcp_points)
    raise HTTPException(status_code=400, detail="Invalid calibration request")

@router.post("/projects/{project_id}/calibrate/dem")
async def calibrate_with_dem_file(
    project_id: str,
    file: UploadFile = File(...)
):
    project = project_store.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    pdir = settings.PROJECTS_DIR / project_id
    pdir.mkdir(parents=True, exist_ok=True)
    temp_dem = pdir / f"uploaded_dem_{file.filename}"
    with open(temp_dem, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        updated = project_service.calibrate_dem(project_id, temp_dem)
        return updated
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DEM calibration failed: {str(e)}")

@router.post("/projects/{project_id}/measure", response_model=Measurement)
def add_measurement(project_id: str, req: MeasureRequest):
    project = project_store.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    import uuid
    from datetime import datetime
    
    m_id = f"M-{uuid.uuid4().hex[:6]}"
    is_metric = project.terrain_stats.is_metric if project.terrain_stats else False
    unit = "m" if is_metric else "relative units"

    val = 0.0
    details = {}

    # Scale factor for horizontal coordinates
    pixel_res_m = 1.0
    if project.image_metadata and project.image_metadata.pixel_size:
        pixel_res_m = float(project.image_metadata.pixel_size[0])
    elif project.terrain_stats and project.terrain_stats.resolution_m:
        pixel_res_m = float(project.terrain_stats.resolution_m)

    is_scene_coords = abs(req.start_point.get("x", 0)) <= 20 and abs(req.start_point.get("y", 0)) <= 20
    scale_factor = (512.0 / 24.0) * pixel_res_m if is_scene_coords else pixel_res_m
    if not is_metric:
        scale_factor = 1.0

    if req.type == "distance" and req.end_point:
        dx = (req.end_point["x"] - req.start_point["x"]) * scale_factor
        dy = (req.end_point["y"] - req.start_point["y"]) * scale_factor
        dz = req.end_point.get("z", 0) - req.start_point.get("z", 0)
        # Spatial 3D distance
        val = float(np.sqrt(dx**2 + dy**2 + dz**2))
        details["dx"] = round(dx, 2)
        details["dy"] = round(dy, 2)
        details["dz"] = round(dz, 2)
        details["horizontal_distance"] = round(float(np.sqrt(dx**2 + dy**2)), 2)

    elif req.type == "height" and req.end_point:
        val = abs(float(req.end_point.get("z", 0) - req.start_point.get("z", 0)))
        details["base_elevation"] = req.start_point.get("z", 0)
        details["top_elevation"] = req.end_point.get("z", 0)

    elif req.type == "slope" and req.end_point:
        dx = (req.end_point["x"] - req.start_point["x"]) * scale_factor
        dy = (req.end_point["y"] - req.start_point["y"]) * scale_factor
        dz = abs(req.end_point.get("z", 0) - req.start_point.get("z", 0))
        h_dist = max(1e-4, float(np.sqrt(dx**2 + dy**2)))
        val = float(np.rad2deg(np.arctan(dz / h_dist)))
        unit = "°"
        details["horizontal_span"] = round(h_dist, 2)
        details["vertical_rise"] = round(dz, 2)

    elif req.type == "point":
        val = float(req.start_point.get("z", 0))
        details["point_coordinates"] = req.start_point

    elif req.type == "area" and req.polygon_points and len(req.polygon_points) >= 3:
        # Shoelace formula for 2D footprint area
        pts = req.polygon_points
        n = len(pts)
        area_calc = 0.0
        for i in range(n):
            j = (i + 1) % n
            area_calc += pts[i]["x"] * pts[j]["y"]
            area_calc -= pts[j]["x"] * pts[i]["y"]
        val = (abs(float(area_calc)) / 2.0) * (scale_factor ** 2)
        unit = "m²" if is_metric else "sq relative units"

    measurement = Measurement(
        id=m_id,
        type=req.type,
        start_point=req.start_point,
        end_point=req.end_point,
        value=round(val, 2),
        unit=unit,
        is_metric=is_metric,
        details=details,
        created_at=datetime.now().isoformat()
    )

    project.measurements.append(measurement)
    project_store.save(project)
    return measurement

@router.delete("/projects/{project_id}/measure/{measurement_id}")
def delete_measurement(project_id: str, measurement_id: str):
    project = project_store.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project.measurements = [m for m in project.measurements if m.id != measurement_id]
    project_store.save(project)
    return {"message": "Measurement deleted"}

@router.get("/projects/{project_id}/explain", response_model=ExplainTerrainResponse)
def explain_terrain(project_id: str):
    try:
        return project_service.explain_terrain(project_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/projects/{project_id}/report")
def get_report(project_id: str, format: str = Query("json")):
    project = project_store.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    report_data = report_service.generate_report_dict(project)
    if format.lower() == "html":
        html = report_service.generate_report_html(report_data)
        return HTMLResponse(content=html)
    return report_data

# Static media endpoints
@router.get("/projects/{project_id}/image")
def get_original_image(project_id: str):
    file_path = settings.PROJECTS_DIR / project_id / "original.png"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(file_path, media_type="image/png")

@router.get("/projects/{project_id}/depth-image")
def get_depth_image(project_id: str):
    file_path = settings.PROJECTS_DIR / project_id / "depth.png"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Depth image not found")
    return FileResponse(file_path, media_type="image/png")

@router.get("/projects/{project_id}/dsm-image")
def get_dsm_image(project_id: str):
    file_path = settings.PROJECTS_DIR / project_id / "dsm_heatmap.png"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="DSM heatmap not found")
    return FileResponse(file_path, media_type="image/png")

@router.get("/projects/{project_id}/hillshade-image")
def get_hillshade_image(project_id: str):
    file_path = settings.PROJECTS_DIR / project_id / "hillshade.png"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Hillshade not found")
    return FileResponse(file_path, media_type="image/png")

@router.get("/projects/{project_id}/slope-image")
def get_slope_image(project_id: str):
    file_path = settings.PROJECTS_DIR / project_id / "slope_map.png"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Slope map not found")
    return FileResponse(file_path, media_type="image/png")

@router.get("/projects/{project_id}/export")
def export_asset(project_id: str, type: str = Query("obj")):
    """
    Export endpoints for:
    - obj: 3D Wavefront Mesh
    - dsm: GeoTIFF or PNG DSM
    - depth: PNG depth map
    - csv: measurements export
    - report: HTML report
    """
    pdir = settings.PROJECTS_DIR / project_id
    project = project_store.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if type == "obj":
        fpath = pdir / "terrain_mesh.obj"
        if not fpath.exists():
            raise HTTPException(status_code=404, detail="3D model not found")
        return FileResponse(fpath, filename=f"{project.name}_3D_mesh.obj", media_type="text/plain")

    elif type == "depth":
        fpath = pdir / "depth.png"
        return FileResponse(fpath, filename=f"{project.name}_depth_map.png", media_type="image/png")

    elif type == "dsm":
        tif_path = pdir / "dsm.tif"
        if tif_path.exists():
            return FileResponse(tif_path, filename=f"{project.name}_DSM.tif", media_type="image/tiff")
        fpath = pdir / "dsm_heatmap.png"
        return FileResponse(fpath, filename=f"{project.name}_DSM.png", media_type="image/png")

    elif type == "csv":
        import io, csv
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Measurement ID", "Type", "Value", "Unit", "Is Metric", "Created At"])
        for m in project.measurements:
            writer.writerow([m.id, m.type, m.value, m.unit, m.is_metric, m.created_at])
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={project.name}_measurements.csv"}
        )

    elif type == "report":
        r_dict = report_service.generate_report_dict(project)
        html = report_service.generate_report_html(r_dict)
        return Response(
            content=html,
            media_type="text/html",
            headers={"Content-Disposition": f"attachment; filename={project.name}_report.html"}
        )

    raise HTTPException(status_code=400, detail=f"Unsupported export type '{type}'")

@router.post("/demo/initialize", response_model=Project)
def initialize_demo_dataset():
    from app.sample_data.sample_generator import create_urban_demo_dataset
    demo_project = create_urban_demo_dataset()
    return demo_project
