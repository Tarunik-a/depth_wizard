from pathlib import Path
from datetime import datetime
import uuid
import numpy as np
from PIL import Image

from app.config import settings
from app.schemas.project import (
    Project,
    ImageMetadata,
    GCPPoint,
    CalibrationData,
    PipelineStep,
    Measurement,
    ExplainTerrainResponse
)
from app.storage.project_store import project_store
from app.services.geospatial_service import geospatial_service
from app.services.ml_service import ml_service
from app.services.dsm_service import dsm_service
from app.services.mesh_service import mesh_service
from app.services.validation_service import validation_service

class ProjectService:
    @staticmethod
    def create_project(name: str, reconstruction_mode: str = "relative") -> Project:
        project_id = str(uuid.uuid4())[:8]
        pdir = settings.PROJECTS_DIR / project_id
        pdir.mkdir(parents=True, exist_ok=True)

        pipeline_steps = [
            PipelineStep(id="upload", label="Image Uploaded", status="pending"),
            PipelineStep(id="metadata", label="Metadata Extracted", status="pending"),
            PipelineStep(id="preprocess", label="Image Preprocessing", status="pending"),
            PipelineStep(id="depth", label="Depth Estimation", status="pending"),
            PipelineStep(id="calibration", label="Metric Calibration", status="pending"),
            PipelineStep(id="dsm", label="DSM Generation", status="pending"),
            PipelineStep(id="mesh", label="3D Mesh Generation", status="pending"),
            PipelineStep(id="texture", label="Texture Mapping", status="pending"),
            PipelineStep(id="validation", label="Validation Check", status="pending"),
        ]

        project = Project(
            id=project_id,
            name=name,
            created_at=datetime.now().isoformat(),
            status="created",
            progress=0,
            current_step="Project initialized",
            pipeline_steps=pipeline_steps,
            reconstruction_mode=reconstruction_mode,
            depth_model=settings.MODEL_NAME,
        )
        return project_store.save(project)

    @staticmethod
    def process_uploaded_image(
        project_id: str,
        image_path: Path,
        preferred_mode: str = "relative",
        invert_depth: bool = False,
        normalize_depth: bool = True
    ) -> Project:
        project = project_store.get(project_id)
        if not project:
            raise ValueError(f"Project {project_id} not found")

        project_dir = settings.PROJECTS_DIR / project_id
        project_dir.mkdir(parents=True, exist_ok=True)

        def update_step(step_id: str, status: str, detail: str = None, progress: int = None):
            for step in project.pipeline_steps:
                if step.id == step_id:
                    step.status = status
                    step.detail = detail
            if progress is not None:
                project.progress = progress
            project.current_step = detail or step_id
            project_store.save(project)

        # Step 1: Upload
        project.status = "processing"
        update_step("upload", "completed", "File stored successfully", 10)

        # Step 2: Metadata Extraction
        meta = geospatial_service.inspect_image_metadata(image_path)
        project.image_metadata = meta
        
        # Decide reconstruction mode based on geospatial metadata
        if preferred_mode == "metric" and not meta.is_georeferenced:
            # Strictly enforce technical honesty
            project.reconstruction_mode = "relative"
            calib_detail = "Non-georeferenced optical image. Metric mode requires DEM/GCP; falling back to Relative DSM."
        else:
            project.reconstruction_mode = preferred_mode
            calib_detail = f"Spatial reference: {meta.crs if meta.crs else 'Uncalibrated image plane'}"
        
        update_step("metadata", "completed", calib_detail, 25)

        # Step 3: Image Preprocessing
        update_step("preprocess", "in_progress", "Preparing image matrix & color planes", 35)
        # Ensure image is saved as standard original.png
        orig_dest = project_dir / "original.png"
        with Image.open(image_path) as img:
            img.convert("RGB").save(orig_dest)
        update_step("preprocess", "completed", f"{meta.width}×{meta.height} processed", 45)

        # Step 4: AI Monocular Depth Estimation
        update_step("depth", "in_progress", "Inferring relative depth with Depth Anything V2", 55)
        depth_grid, depth_img = ml_service.estimate_depth(
            orig_dest,
            invert=invert_depth,
            normalize=normalize_depth
        )
        # Save depth representations
        np.save(project_dir / "depth.npy", depth_grid)
        depth_img.save(project_dir / "depth.png")
        update_step("depth", "completed", "Continuous relative depth map generated", 70)

        # Step 5: Calibration Check
        if project.reconstruction_mode == "metric" and meta.has_dem:
            update_step("calibration", "completed", "Calibrated via DEM", 75)
        else:
            update_step("calibration", "completed", "Uncalibrated relative scale", 75)

        # Step 6: DSM Generation
        update_step("dsm", "in_progress", "Generating Digital Surface Model & slope grid", 80)
        elev_grid, terrain_stats, dsm_heatmap, hillshade_img, slope_img = dsm_service.generate_dsm(
            depth_grid,
            calibration=project.calibration,
            is_georeferenced=meta.is_georeferenced,
            pixel_resolution_m=meta.pixel_size[0] if (meta.pixel_size and meta.is_georeferenced) else 1.0,
            output_dir=project_dir
        )
        project.terrain_stats = terrain_stats
        update_step("dsm", "completed", f"DSM generated (Span: {terrain_stats.min_elevation}–{terrain_stats.max_elevation} {terrain_stats.elevation_unit})", 88)

        # Step 7 & 8: 3D Mesh & Texture Mapping
        update_step("mesh", "in_progress", "Constructing 3D surface mesh & OBJ export", 92)
        obj_file = project_dir / "terrain_mesh.obj"
        mesh_service.export_obj(elev_grid, obj_file, target_grid_size=128)
        update_step("mesh", "completed", "128×128 terrain mesh generated", 95)
        update_step("texture", "completed", "Original texture projection ready", 97)

        # Step 9: Validation Check
        ref_file = project_dir / "reference_dsm.npy"
        if ref_file.exists():
            ref_dsm = np.load(ref_file)
            val_stats = validation_service.calculate_validation(elev_grid, ref_dsm, is_sample_data=False)
        else:
            val_stats = validation_service.calculate_validation(elev_grid, None, is_sample_data=False)
        project.validation = val_stats
        update_step("validation", "completed", val_stats.message or "Validation check completed", 100)

        # Finalize project status & URLs
        project.status = "ready"
        project.progress = 100
        project.current_step = "Reconstruction completed successfully"
        project.image_url = f"/api/projects/{project_id}/image"
        project.depth_map_url = f"/api/projects/{project_id}/depth-image"
        project.dsm_url = f"/api/projects/{project_id}/dsm-image"
        project.hillshade_url = f"/api/projects/{project_id}/hillshade-image"
        project.slope_map_url = f"/api/projects/{project_id}/slope-image"
        project.mesh_url = f"/api/projects/{project_id}/mesh"

        return project_store.save(project)

    @staticmethod
    def calibrate_gcp(project_id: str, points: list[GCPPoint]) -> Project:
        project = project_store.get(project_id)
        if not project:
            raise ValueError(f"Project {project_id} not found")
        project_dir = settings.PROJECTS_DIR / project_id
        depth_file = project_dir / "depth.npy"
        if not depth_file.exists():
            raise ValueError("Project depth map not generated yet")

        depth_grid = np.load(depth_file)
        calib_data = geospatial_service.calibrate_with_gcps(depth_grid, points)
        project.calibration = calib_data

        if calib_data.status == "calibrated":
            project.reconstruction_mode = "metric"
            # Re-generate DSM with new calibration
            elev_grid, terrain_stats, _, _, _ = dsm_service.generate_dsm(
                depth_grid,
                calibration=calib_data,
                is_georeferenced=project.image_metadata.is_georeferenced if project.image_metadata else False,
                pixel_resolution_m=1.0,
                output_dir=project_dir
            )
            project.terrain_stats = terrain_stats
            # Update mesh
            mesh_service.export_obj(elev_grid, project_dir / "terrain_mesh.obj", target_grid_size=128)

        return project_store.save(project)

    @staticmethod
    def calibrate_dem(project_id: str, dem_file_path: Path) -> Project:
        project = project_store.get(project_id)
        if not project:
            raise ValueError(f"Project {project_id} not found")
        project_dir = settings.PROJECTS_DIR / project_id
        depth_file = project_dir / "depth.npy"
        if not depth_file.exists():
            raise ValueError("Project depth map not generated yet")

        depth_grid = np.load(depth_file)

        # Read DEM using tifffile or PIL
        try:
            import tifffile
            dem_data = tifffile.imread(dem_file_path)
            if len(dem_data.shape) > 2:
                dem_data = dem_data[0]
        except Exception:
            from PIL import Image
            dem_data = np.array(Image.open(dem_file_path))

        calib_data = geospatial_service.calibrate_with_dem(depth_grid, dem_data)
        project.calibration = calib_data

        if calib_data.status == "calibrated":
            project.reconstruction_mode = "metric"
            elev_grid, terrain_stats, _, _, _ = dsm_service.generate_dsm(
                depth_grid,
                calibration=calib_data,
                is_georeferenced=project.image_metadata.is_georeferenced if project.image_metadata else False,
                pixel_resolution_m=project.image_metadata.pixel_size[0] if (project.image_metadata and project.image_metadata.pixel_size) else 1.0,
                output_dir=project_dir
            )
            project.terrain_stats = terrain_stats
            mesh_service.export_obj(elev_grid, project_dir / "terrain_mesh.obj", target_grid_size=128)

            # Save reference DEM for validation
            np.save(project_dir / "reference_dsm.npy", dem_data.astype(np.float32))
            project.validation = validation_service.calculate_validation(
                elev_grid,
                dem_data.astype(np.float32),
                is_sample_data=False,
                reference_name="Uploaded Reference DEM"
            )

        return project_store.save(project)

    @staticmethod
    def explain_terrain(project_id: str) -> ExplainTerrainResponse:
        project = project_store.get(project_id)
        if not project or not project.terrain_stats:
            raise ValueError("Terrain analysis requires processed project")

        t = project.terrain_stats
        unit = t.elevation_unit

        summary = (
            f"The analyzed area spans an elevation range of {t.min_elevation} to {t.max_elevation} {unit}. "
            f"The terrain displays an average slope of {t.avg_slope:.1f}° with peak slopes reaching {t.max_slope:.1f}°. "
            f"A total of {t.elevation_transitions} significant elevation transitions were identified across the surface."
        )

        return ExplainTerrainResponse(
            elevation_range=f"{t.min_elevation} – {t.max_elevation} {unit}",
            average_slope=t.avg_slope,
            maximum_slope=t.max_slope,
            elevation_transitions=t.elevation_transitions,
            elevated_structures="Detected from available reconstruction elevation gradients" if t.elevated_structures_detected else "No pronounced vertical structures detected",
            potential_inspection_regions=t.potential_inspection_regions,
            structural_detection_status="Structural detection module not enabled (slope & gradient heuristic active)",
            is_metric=t.is_metric,
            summary_text=summary
        )

project_service = ProjectService()
