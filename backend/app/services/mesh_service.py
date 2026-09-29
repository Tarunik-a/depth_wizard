from pathlib import Path
from typing import Dict, Any
import numpy as np
import cv2

class MeshService:
    @staticmethod
    def export_heightfield_json(
        elevation_grid: np.ndarray,
        target_grid_size: int = 128
    ) -> Dict[str, Any]:
        """
        Creates a lightweight heightfield grid description for Three.js PlaneGeometry displacement.
        """
        H, W = elevation_grid.shape
        # Downsample to target grid size for smooth WebGL rendering
        if max(H, W) > target_grid_size:
            resampled = cv2.resize(elevation_grid, (target_grid_size, target_grid_size), interpolation=cv2.INTER_AREA)
        else:
            resampled = elevation_grid

        min_e = float(np.min(resampled))
        max_e = float(np.max(resampled))
        
        # Normalized heights in [0, 1] for WebGL vertex shader or displacement
        span = max_e - min_e
        normalized_data = (resampled - min_e) / span if span > 1e-5 else np.zeros_like(resampled)

        return {
            "grid_width": resampled.shape[1],
            "grid_height": resampled.shape[0],
            "aspect_ratio": round(float(W / H), 4),
            "min_elevation": round(min_e, 2),
            "max_elevation": round(max_e, 2),
            "elevation_span": round(span, 2),
            "heights": np.round(resampled, 2).tolist(),
            "normalized_heights": np.round(normalized_data, 4).tolist()
        }

    @staticmethod
    def export_obj(
        elevation_grid: np.ndarray,
        output_file: Path,
        target_grid_size: int = 100,
        z_scale: float = 0.25
    ):
        """
        Exports a Wavefront .OBJ 3D terrain surface with vertex positions, UV coordinates, and faces.
        """
        H, W = elevation_grid.shape
        resampled = cv2.resize(elevation_grid, (target_grid_size, target_grid_size), interpolation=cv2.INTER_AREA)
        grid_h, grid_w = resampled.shape

        min_e = float(np.min(resampled))
        max_e = float(np.max(resampled))
        span = max_e - min_e if (max_e - min_e) > 1e-4 else 1.0

        with open(output_file, "w", encoding="utf-8") as f:
            f.write("# DepthWizard 3D Terrain Mesh\n")
            f.write(f"# Grid: {grid_w}x{grid_h}\n")
            
            # Vertices
            for i in range(grid_h):
                for j in range(grid_w):
                    # Center around origin: X in [-10, 10], Y in [-10, 10]
                    x = (j / (grid_w - 1) - 0.5) * 20.0
                    y = ((grid_h - 1 - i) / (grid_h - 1) - 0.5) * 20.0 * (H / W)
                    z = ((resampled[i, j] - min_e) / span) * (20.0 * z_scale)
                    f.write(f"v {x:.4f} {z:.4f} {-y:.4f}\n")

            # UV coordinates
            for i in range(grid_h):
                for j in range(grid_w):
                    u = j / (grid_w - 1)
                    v = (grid_h - 1 - i) / (grid_h - 1)
                    f.write(f"vt {u:.4f} {v:.4f}\n")

            # Faces (triangulated quad cells)
            for i in range(grid_h - 1):
                for j in range(grid_w - 1):
                    # Vertex indices (1-based)
                    v1 = i * grid_w + j + 1
                    v2 = i * grid_w + (j + 1) + 1
                    v3 = (i + 1) * grid_w + (j + 1) + 1
                    v4 = (i + 1) * grid_w + j + 1

                    f.write(f"f {v1}/{v1} {v2}/{v2} {v3}/{v3}\n")
                    f.write(f"f {v1}/{v1} {v3}/{v3} {v4}/{v4}\n")

mesh_service = MeshService()
