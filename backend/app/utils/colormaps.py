import numpy as np
from PIL import Image
import matplotlib.cm as cm

def apply_colormap(normalized_data: np.ndarray, cmap_name: str = "turbo") -> Image.Image:
    """
    Applies a scientific colormap to a 2D float array in range [0, 1].
    Returns a PIL Image in RGB format.
    """
    clamped = np.clip(normalized_data, 0.0, 1.0)
    
    try:
        colormap = cm.get_cmap(cmap_name)
    except Exception:
        colormap = cm.get_cmap("viridis")
        
    rgba = colormap(clamped)
    rgb = (rgba[:, :, :3] * 255).astype(np.uint8)
    return Image.fromarray(rgb)

def depth_to_grayscale(depth_norm: np.ndarray, invert: bool = False) -> Image.Image:
    """
    Converts normalized depth [0, 1] to 8-bit grayscale image.
    By default in depth estimation, brighter = closer / higher elevation.
    """
    data = 1.0 - depth_norm if invert else depth_norm
    data_8bit = (np.clip(data, 0.0, 1.0) * 255).astype(np.uint8)
    return Image.fromarray(data_8bit, mode='L')
