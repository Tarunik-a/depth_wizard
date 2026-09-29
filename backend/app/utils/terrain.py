import numpy as np
from PIL import Image

def calculate_slope_and_aspect(elevation_grid: np.ndarray, cell_size: float = 1.0) -> tuple[np.ndarray, np.ndarray]:
    """
    Computes slope (in degrees) and aspect (in degrees 0-360) using 2nd-order central differences (Horn's method).
    """
    H, W = elevation_grid.shape
    # Sobel / Horn's kernel weights
    dz_dx = np.zeros_like(elevation_grid, dtype=np.float32)
    dz_dy = np.zeros_like(elevation_grid, dtype=np.float32)
    
    # Interior points gradient
    dz_dx[1:-1, 1:-1] = (
        (elevation_grid[:-2, 2:] + 2 * elevation_grid[1:-1, 2:] + elevation_grid[2:, 2:]) -
        (elevation_grid[:-2, :-2] + 2 * elevation_grid[1:-1, :-2] + elevation_grid[2:, :-2])
    ) / (8.0 * cell_size)

    dz_dy[1:-1, 1:-1] = (
        (elevation_grid[2:, :-2] + 2 * elevation_grid[2:, 1:-1] + elevation_grid[2:, 2:]) -
        (elevation_grid[:-2, :-2] + 2 * elevation_grid[:-2, 1:-1] + elevation_grid[:-2, 2:])
    ) / (8.0 * cell_size)

    # Edge padding with simple differences
    dz_dx[:, 0] = dz_dx[:, 1]
    dz_dx[:, -1] = dz_dx[:, -2]
    dz_dy[0, :] = dz_dy[1, :]
    dz_dy[-1, :] = dz_dy[-2, :]

    # Slope in radians and degrees
    slope_rad = np.arctan(np.sqrt(dz_dx**2 + dz_dy**2))
    slope_deg = np.rad2deg(slope_rad)

    # Aspect in degrees (0 = North, 90 = East, 180 = South, 270 = West)
    aspect_rad = np.arctan2(dz_dy, -dz_dx)
    aspect_deg = np.rad2deg(aspect_rad)
    aspect_deg = 90.0 - aspect_deg
    aspect_deg = np.where(aspect_deg < 0, aspect_deg + 360.0, aspect_deg)
    aspect_deg = np.where(aspect_deg >= 360, aspect_deg - 360.0, aspect_deg)

    return slope_deg, aspect_deg

def generate_hillshade(
    elevation_grid: np.ndarray,
    azimuth: float = 315.0,
    altitude: float = 45.0,
    cell_size: float = 1.0,
    z_factor: float = 1.0
) -> Image.Image:
    """
    Generates standard GIS hillshade relief map.
    Returns 8-bit grayscale PIL Image.
    """
    scaled_elevation = elevation_grid * z_factor
    slope_deg, aspect_deg = calculate_slope_and_aspect(scaled_elevation, cell_size=cell_size)
    
    slope_rad = np.deg2rad(slope_deg)
    aspect_rad = np.deg2rad(aspect_deg)

    zenith_rad = np.deg2rad(90.0 - altitude)
    azimuth_math = 360.0 - azimuth + 90.0
    if azimuth_math >= 360.0:
        azimuth_math -= 360.0
    azimuth_rad = np.deg2rad(azimuth_math)

    hillshade = 255.0 * (
        (np.cos(zenith_rad) * np.cos(slope_rad)) +
        (np.sin(zenith_rad) * np.sin(slope_rad) * np.cos(azimuth_rad - aspect_rad))
    )
    hillshade = np.clip(hillshade, 0.0, 255.0).astype(np.uint8)
    return Image.fromarray(hillshade, mode='L')

def categorize_slopes(slope_deg: np.ndarray) -> dict[str, float]:
    """
    Categorizes slopes into GIS standard brackets:
    Flat: < 2 deg
    Low: 2 - 8 deg
    Moderate: 8 - 20 deg
    Steep: 20 - 35 deg
    Very Steep: > 35 deg
    Returns percentage for each category.
    """
    total = slope_deg.size
    if total == 0:
        return {"flat": 0, "low": 0, "moderate": 0, "steep": 0, "very_steep": 0}
        
    flat_pct = float(np.sum(slope_deg < 2.0) / total * 100.0)
    low_pct = float(np.sum((slope_deg >= 2.0) & (slope_deg < 8.0)) / total * 100.0)
    mod_pct = float(np.sum((slope_deg >= 8.0) & (slope_deg < 20.0)) / total * 100.0)
    steep_pct = float(np.sum((slope_deg >= 20.0) & (slope_deg < 35.0)) / total * 100.0)
    vsteep_pct = float(np.sum(slope_deg >= 35.0) / total * 100.0)

    return {
        "flat": round(flat_pct, 1),
        "low": round(low_pct, 1),
        "moderate": round(mod_pct, 1),
        "steep": round(steep_pct, 1),
        "very_steep": round(vsteep_pct, 1)
    }

def detect_elevation_transitions(elevation_grid: np.ndarray) -> int:
    """
    Counts distinct significant elevation contour intervals/transitions across the scene.
    """
    min_val, max_val = float(np.min(elevation_grid)), float(np.max(elevation_grid))
    span = max_val - min_val
    if span <= 1e-4:
        return 0
    # Step into 10% bins and count transitions with substantial area
    bins = np.linspace(min_val, max_val, 10)
    digitized = np.digitize(elevation_grid, bins)
    unique_levels = len(np.unique(digitized))
    return max(1, unique_levels - 1)
