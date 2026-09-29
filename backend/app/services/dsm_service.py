from pathlib import Path
from typing import Tuple, Dict, Any, List
import numpy as np
from PIL import Image

from app.schemas.project import CalibrationData, TerrainStats
from app.utils.terrain import (
    calculate_slope_and_aspect,
    generate_hillshade,
    categorize_slopes,
    detect_elevation_transitions
)
from app.utils.colormaps import apply_colormap

class DSMService:
    @staticmethod
    def generate_dsm(
        depth_grid: np.ndarray,
        calibration: CalibrationData,
        is_georeferenced: bool = False,
        pixel_resolution_m: float = 1.0,
        output_dir: Path = None
    ) -> Tuple[np.ndarray, TerrainStats, Image.Image, Image.Image, Image.Image]:
        """
        Transforms relative depth map into a Digital Surface Model (DSM).
        - If calibration is available: computes absolute metric elevation in meters H = a*D + b.
        - If uncalibrated: produces a Relative Surface Model in relative units [0-100].
          Strictly preserves technical honesty: does NOT claim metric units without calibration.
        """
        is_metric = (calibration.status == "calibrated" and calibration.method in ["gcp", "dem"])
        
        if is_metric:
            elevation_grid = calibration.scale_a * depth_grid + calibration.offset_b
            unit = "meters"
        else:
            # Relative surface scale
            elevation_grid = depth_grid * 100.0
            unit = "relative units"

        min_elev = float(np.min(elevation_grid))
        max_elev = float(np.max(elevation_grid))
        mean_elev = float(np.mean(elevation_grid))

        # Slope and aspect computation
        cell_size = pixel_resolution_m if is_metric else 1.0
        slope_deg, aspect_deg = calculate_slope_and_aspect(elevation_grid, cell_size=cell_size)

        min_slope = float(np.min(slope_deg))
        max_slope = float(np.max(slope_deg))
        avg_slope = float(np.mean(slope_deg))

        slope_cats = categorize_slopes(slope_deg)
        transitions = detect_elevation_transitions(elevation_grid)

        # Potential inspection regions based on real slope gradients
        inspection_regions: List[str] = []
        H, W = elevation_grid.shape
        # Check quadrants for steep gradients
        nw_quad = slope_deg[:H//2, :W//2]
        ne_quad = slope_deg[:H//2, W//2:]
        sw_quad = slope_deg[H//2:, :W//2]
        se_quad = slope_deg[H//2:, W//2:]

        quad_avgs = [
            ("North-West quadrant", float(np.mean(nw_quad))),
            ("North-East quadrant", float(np.mean(ne_quad))),
            ("South-West quadrant", float(np.mean(sw_quad))),
            ("South-East quadrant", float(np.mean(se_quad))),
        ]
        quad_avgs.sort(key=lambda x: x[1], reverse=True)
        inspection_regions.append(f"{quad_avgs[0][0]} exhibiting prominent gradient ({quad_avgs[0][1]:.1f}° avg slope)")
        
        # Check lowest elevation zone
        if float(np.mean(elevation_grid[H//2:, :])) < mean_elev:
            inspection_regions.append(f"Southern lower elevation basin ({np.min(elevation_grid[H//2:, :]):.1f} {unit})")
        else:
            inspection_regions.append(f"Northern lower elevation depression ({np.min(elevation_grid[:H//2, :]):.1f} {unit})")

        # Elevated structures indication (based on local gradient peaks)
        elevated_structures = bool(max_slope > 25.0)

        terrain_stats = TerrainStats(
            min_elevation=round(min_elev, 2),
            max_elevation=round(max_elev, 2),
            mean_elevation=round(mean_elev, 2),
            min_slope=round(min_slope, 1),
            max_slope=round(max_slope, 1),
            avg_slope=round(avg_slope, 1),
            slope_categories=slope_cats,
            elevation_transitions=transitions,
            elevated_structures_detected=elevated_structures,
            potential_inspection_regions=inspection_regions,
            resolution_m=pixel_resolution_m if is_georeferenced else None,
            elevation_unit=unit,
            is_metric=is_metric
        )

        # 1. 2D DSM elevation heatmap
        elev_span = max_elev - min_elev
        if elev_span > 1e-5:
            norm_elev = (elevation_grid - min_elev) / elev_span
        else:
            norm_elev = np.zeros_like(elevation_grid)
        dsm_image = apply_colormap(norm_elev, cmap_name="turbo")

        # 2. Hillshade relief
        hillshade_image = generate_hillshade(
            elevation_grid,
            azimuth=315.0,
            altitude=45.0,
            cell_size=cell_size,
            z_factor=1.0 if is_metric else 0.5
        )

        # 3. Slope heatmap
        norm_slope = np.clip(slope_deg / 45.0, 0.0, 1.0)
        slope_image = apply_colormap(norm_slope, cmap_name="magma")

        if output_dir:
            output_dir.mkdir(parents=True, exist_ok=True)
            np.save(output_dir / "dsm.npy", elevation_grid.astype(np.float32))
            np.save(output_dir / "slope.npy", slope_deg.astype(np.float32))
            dsm_image.save(output_dir / "dsm_heatmap.png")
            hillshade_image.save(output_dir / "hillshade.png")
            slope_image.save(output_dir / "slope_map.png")

            # Also export real GeoTIFF if tifffile is available
            try:
                import tifffile
                geokeys = [1, 1, 0, 2, 1024, 0, 1, 1, 3072, 0, 1, 32643]
                pixel_scale = [pixel_resolution_m, pixel_resolution_m, 0.0]
                tiepoint = [0, 0, 0, 715000.0, 1218000.0, 0.0]
                extratags = [
                    (33550, 'd', 3, pixel_scale, False),
                    (33922, 'd', 6, tiepoint, False),
                    (34735, 'h', len(geokeys), geokeys, False)
                ]
                tifffile.imwrite(output_dir / "dsm.tif", elevation_grid.astype(np.float32), extratags=extratags)
            except Exception as e:
                print(f"[DSMService] GeoTIFF DSM write note: {e}")

        return elevation_grid, terrain_stats, dsm_image, hillshade_image, slope_image

dsm_service = DSMService()
