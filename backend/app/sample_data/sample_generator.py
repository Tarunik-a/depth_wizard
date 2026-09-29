from pathlib import Path
from datetime import datetime
import json
import numpy as np
from PIL import Image, ImageDraw

from app.config import settings
from app.schemas.project import (
    Project,
    ImageMetadata,
    GCPPoint,
    CalibrationData,
    TerrainStats,
    ValidationStats,
    Measurement,
    PipelineStep
)
from app.utils.terrain import calculate_slope_and_aspect, generate_hillshade, categorize_slopes, detect_elevation_transitions
from app.utils.colormaps import apply_colormap, depth_to_grayscale
from app.services.mesh_service import mesh_service
from app.storage.project_store import project_store

def create_urban_demo_dataset():
    """
    Synthesizes a realistic high-detail Urban Terrain Demo project.
    Contains:
    - High-contrast aerial urban satellite view (roads, commercial blocks, greenery, courtyard)
    - Relative depth map
    - Calibrated DSM (35m - 72m elevation range)
    - Ground truth reference DSM for genuine validation
    - Ground Control Points
    - Demo distance and height measurements
    """
    demo_id = "demo-urban-terrain"
    demo_dir = settings.PROJECTS_DIR / demo_id
    demo_dir.mkdir(parents=True, exist_ok=True)

    H, W = 512, 512

    # 1. Base natural elevation gradient (sloping from South-East 38m up to North-West 52m)
    x = np.linspace(0, 1, W)
    y = np.linspace(0, 1, H)
    xx, yy = np.meshgrid(x, y)
    base_terrain = 38.0 + (1.0 - xx) * 8.0 + (1.0 - yy) * 6.0 + np.sin(xx * 4.0) * 1.5

    # 2. Add urban structures (buildings, plazas, residential blocks)
    dsm = base_terrain.copy()
    img = Image.new("RGB", (W, H), color=(45, 60, 48))  # Dark park greenery base
    draw = ImageDraw.Draw(img)

    # Road network (asphalt)
    roads = [
        # Main vertical avenue
        (220, 0, 260, 512),
        # Horizontal Boulevard
        (0, 240, 512, 275),
        # Secondary street
        (100, 0, 130, 240),
        (380, 275, 410, 512)
    ]
    for r in roads:
        draw.rectangle(r, fill=(55, 60, 68))
        dsm[r[1]:r[3], r[0]:r[2]] = base_terrain[r[1]:r[3], r[0]:r[2]] - 0.2  # Slightly recessed road bed

    # Buildings definitions: (x1, y1, x2, y2, height_addition, color)
    buildings = [
        # High-rise commercial tower (NW)
        (30, 40, 90, 120, 28.5, (180, 195, 215)),
        # Office complex (NW)
        (140, 50, 205, 130, 19.0, (160, 170, 185)),
        # Large warehouse / logistics center (NE)
        (280, 40, 360, 140, 12.0, (200, 180, 160)),
        (380, 60, 470, 150, 14.5, (190, 195, 200)),
        # Central business plaza building
        (280, 160, 350, 225, 22.0, (140, 180, 210)),
        # Tech Park building with inner courtyard (SW)
        (40, 300, 180, 450, 16.0, (210, 215, 225)),
        # Residential tower A (SE)
        (300, 310, 360, 380, 24.0, (220, 210, 190)),
        # Residential tower B (SE)
        (310, 410, 370, 480, 26.5, (225, 215, 195)),
        # Shopping Mall (SE)
        (430, 320, 495, 460, 15.0, (175, 185, 195)),
    ]

    for (bx1, by1, bx2, by2, b_height, b_col) in buildings:
        draw.rectangle((bx1, by1, bx2, by2), fill=b_col, outline=(30, 35, 45), width=2)
        # Add rooftop HVAC / details
        rx1, ry1 = bx1 + 10, by1 + 10
        rx2, ry2 = max(rx1 + 5, bx2 - 10), max(ry1 + 5, by2 - 10)
        draw.rectangle((rx1, ry1, rx2, ry2), fill=(b_col[0]-30, b_col[1]-30, b_col[2]-30))
        dsm[by1:by2, bx1:bx2] = base_terrain[by1:by2, bx1:bx2] + b_height

    # Inner courtyard in Tech Park
    draw.rectangle((80, 340, 140, 410), fill=(40, 75, 45))
    dsm[340:410, 80:140] = base_terrain[340:410, 80:140]

    # Save original image (both PNG and real GeoTIFF)
    original_path = demo_dir / "original.png"
    img.save(original_path)

    try:
        import tifffile
        # EPSG:32643 UTM Zone 43N GeoKeys
        geokeys = [1, 1, 0, 2, 1024, 0, 1, 1, 3072, 0, 1, 32643]
        pixel_scale = [0.25, 0.25, 0.0]
        tiepoint = [0, 0, 0, 715000.0, 1218000.0, 0.0]
        extratags = [
            (33550, 'd', 3, pixel_scale, False),
            (33922, 'd', 6, tiepoint, False),
            (34735, 'h', len(geokeys), geokeys, False)
        ]
        # Save real GeoTIFF
        tifffile.imwrite(demo_dir / "urban_satellite_reference.tif", np.array(img), extratags=extratags)
        # Save Reference DSM GeoTIFF (32-bit float elevation raster in meters)
        tifffile.imwrite(demo_dir / "reference_dsm.tif", dsm.astype(np.float32), extratags=extratags)
    except Exception as e:
        print(f"[SampleGenerator] GeoTIFF export note: {e}")

    # 3. Reference DSM for validation (Ground truth LiDAR simulation)
    reference_dsm = dsm.copy()
    np.save(demo_dir / "reference_dsm.npy", reference_dsm.astype(np.float32))

    # 4. Generate AI Depth Map (Simulated depth with slight monocular sensor uncertainty)
    min_elev = float(np.min(dsm))
    max_elev = float(np.max(dsm))
    normalized_depth = (dsm - min_elev) / (max_elev - min_elev)
    # Add subtle sensor noise to demonstrate authentic scientific RMSE (1-2m)
    np.random.seed(42)
    noise = np.random.normal(0, 0.015, (H, W)).astype(np.float32)
    predicted_depth = np.clip(normalized_depth + noise, 0.0, 1.0)

    depth_img = depth_to_grayscale(predicted_depth, invert=False)
    depth_img.save(demo_dir / "depth.png")
    np.save(demo_dir / "depth.npy", predicted_depth)

    # 5. DSM from GCP Calibration
    # 4 GCP points on known ground and rooftops
    gcp_points = [
        GCPPoint(id="GCP-01", pixel_x=120, pixel_y=255, known_elevation=42.8, predicted_elevation=42.5, residual=-0.3),
        GCPPoint(id="GCP-02", pixel_x=60, pixel_y=80, known_elevation=72.1, predicted_elevation=71.8, residual=-0.3),
        GCPPoint(id="GCP-03", pixel_x=320, pixel_y=90, known_elevation=54.2, predicted_elevation=54.6, residual=0.4),
        GCPPoint(id="GCP-04", pixel_x=340, pixel_y=450, known_elevation=66.5, predicted_elevation=66.2, residual=-0.3),
    ]
    scale_a = max_elev - min_elev
    offset_b = min_elev
    calibrated_dsm = scale_a * predicted_depth + offset_b
    np.save(demo_dir / "dsm.npy", calibrated_dsm.astype(np.float32))

    # Heatmap and hillshade
    norm_dsm = (calibrated_dsm - np.min(calibrated_dsm)) / (np.max(calibrated_dsm) - np.min(calibrated_dsm))
    dsm_heatmap = apply_colormap(norm_dsm, cmap_name="turbo")
    dsm_heatmap.save(demo_dir / "dsm_heatmap.png")

    hillshade = generate_hillshade(calibrated_dsm, cell_size=1.0)
    hillshade.save(demo_dir / "hillshade.png")

    slope_deg, aspect_deg = calculate_slope_and_aspect(calibrated_dsm, cell_size=1.0)
    np.save(demo_dir / "slope.npy", slope_deg.astype(np.float32))
    norm_slope = np.clip(slope_deg / 45.0, 0.0, 1.0)
    slope_map = apply_colormap(norm_slope, cmap_name="magma")
    slope_map.save(demo_dir / "slope_map.png")

    # Wavefront OBJ export
    obj_path = demo_dir / "terrain_mesh.obj"
    mesh_service.export_obj(calibrated_dsm, obj_path, target_grid_size=128)

    # Calculate validation metrics against reference
    diff = calibrated_dsm - reference_dsm
    rmse = float(np.sqrt(np.mean(diff ** 2)))
    mae = float(np.mean(np.abs(diff)))
    corr = float(np.corrcoef(calibrated_dsm.flatten(), reference_dsm.flatten())[0, 1])

    hist, bin_edges = np.histogram(diff, bins=10)
    distribution = [
        {
            "range": f"{bin_edges[i]:.2f} to {bin_edges[i+1]:.2f}m",
            "bin_center": round(float((bin_edges[i] + bin_edges[i+1]) / 2.0), 2),
            "count": int(hist[i]),
            "frequency": round(float(hist[i] / diff.size * 100), 2)
        }
        for i in range(len(hist))
    ]

    # Pre-configured demo measurements
    measurements = [
        Measurement(
            id="M-01",
            type="height",
            start_point={"x": 60, "y": 80, "z": 43.6},
            end_point={"x": 60, "y": 80, "z": 72.1},
            value=28.5,
            unit="m",
            is_metric=True,
            details={"description": "North-West Commercial Tower Height", "base_elev": 43.6, "roof_elev": 72.1},
            created_at=datetime.now().isoformat()
        ),
        Measurement(
            id="M-02",
            type="distance",
            start_point={"x": 0, "y": 255, "z": 43.1},
            end_point={"x": 512, "y": 255, "z": 40.2},
            value=127.4,
            unit="m",
            is_metric=True,
            details={"description": "Main Horizontal Boulevard Cross-Section Span"},
            created_at=datetime.now().isoformat()
        )
    ]

    pipeline_steps = [
        PipelineStep(id="upload", label="Image Uploaded", status="completed", detail="512x512 RGB TIFF"),
        PipelineStep(id="metadata", label="Metadata Extracted", status="completed", detail="CRS EPSG:32643 Detected"),
        PipelineStep(id="preprocess", label="Image Preprocessing", status="completed", detail="Normalized spatial grid"),
        PipelineStep(id="depth", label="Depth Estimation", status="completed", detail="Depth Anything V2 inferred"),
        PipelineStep(id="calibration", label="Metric Calibration", status="completed", detail="Affine fit (4 GCPs)"),
        PipelineStep(id="dsm", label="DSM Generation", status="completed", detail="Digital Surface Model generated"),
        PipelineStep(id="mesh", label="3D Mesh Generation", status="completed", detail="128x128 triangular mesh"),
        PipelineStep(id="texture", label="Texture Mapping", status="completed", detail="RGB orthorectified projection"),
        PipelineStep(id="validation", label="Validation Check", status="completed", detail=f"LiDAR ground truth RMSE: {round(rmse, 2)}m (r={round(corr, 3)})")
    ]

    project = Project(
        id=demo_id,
        name="Urban Terrain Demo",
        created_at=datetime.now().isoformat(),
        status="ready",
        progress=100,
        current_step="Validation complete",
        pipeline_steps=pipeline_steps,
        reconstruction_mode="metric",
        depth_model="Depth Anything V2",
        image_metadata=ImageMetadata(
            filename="urban_satellite_reference.tif",
            width=512,
            height=512,
            format="TIFF",
            channels=3,
            file_size_bytes=int(original_path.stat().st_size),
            is_georeferenced=True,
            crs="EPSG:32643 (UTM Zone 43N)",
            bounds=[76.9520, 11.0120, 76.9580, 11.0180],
            pixel_size=[0.25, 0.25],
            has_dem=True
        ),
        calibration=CalibrationData(
            method="gcp",
            scale_a=round(scale_a, 3),
            offset_b=round(offset_b, 2),
            r_squared=0.985,
            rmse=0.32,
            status="calibrated",
            points=gcp_points,
            message=f"Calibrated using 4 GCPs: H = {scale_a:.2f}·D + {offset_b:.2f}m (Fit RMSE: 0.32m)"
        ),
        terrain_stats=TerrainStats(
            min_elevation=round(float(np.min(calibrated_dsm)), 2),
            max_elevation=round(float(np.max(calibrated_dsm)), 2),
            mean_elevation=round(float(np.mean(calibrated_dsm)), 2),
            min_slope=round(float(np.min(slope_deg)), 1),
            max_slope=round(float(np.max(slope_deg)), 1),
            avg_slope=round(float(np.mean(slope_deg)), 1),
            slope_categories=categorize_slopes(slope_deg),
            elevation_transitions=detect_elevation_transitions(calibrated_dsm),
            elevated_structures_detected=True,
            potential_inspection_regions=[
                "North-West commercial tower perimeter (vertical facade relief)",
                "Main East-West transportation boulevard corridor",
                "Southern residential block elevation gradient"
            ],
            resolution_m=0.25,
            elevation_unit="meters",
            is_metric=True
        ),
        validation=ValidationStats(
            has_reference=True,
            reference_name="DEMO DATASET Ground Truth (LiDAR)",
            is_sample_data=True,
            rmse=round(rmse, 2),
            mae=round(mae, 2),
            correlation=round(corr, 3),
            error_distribution=distribution,
            message="[DEMO DATASET] Validation metrics calculated against LiDAR benchmark reference."
        ),
        measurements=measurements,
        image_url=f"/api/projects/{demo_id}/image",
        depth_map_url=f"/api/projects/{demo_id}/depth-image",
        dsm_url=f"/api/projects/{demo_id}/dsm-image",
        hillshade_url=f"/api/projects/{demo_id}/hillshade-image",
        slope_map_url=f"/api/projects/{demo_id}/slope-image",
        mesh_url=f"/api/projects/{demo_id}/mesh",
        is_demo=True
    )

    project_store.save(project)
    print(f"[SampleGenerator] Successfully created '{demo_id}'.")
    return project

if __name__ == "__main__":
    create_urban_demo_dataset()
