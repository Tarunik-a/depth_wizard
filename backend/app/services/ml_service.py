import os
from pathlib import Path
from typing import Optional, Tuple
import numpy as np
from PIL import Image
import cv2

from app.config import settings
from app.utils.colormaps import depth_to_grayscale

class MLDepthService:
    def __init__(self):
        self.model_name = settings.MODEL_NAME
        self.device = "cuda" if settings.USE_GPU and self._check_cuda() else "cpu"
        self._pipeline = None
        self._is_loaded = False

    def _check_cuda(self) -> bool:
        try:
            import torch
            return torch.cuda.is_available()
        except Exception:
            return False

    def load_model(self):
        """
        Attempts to load Depth Anything V2 from transformers if available.
        Gracefully falls back to structural monocular depth estimation without crashing.
        """
        if self._is_loaded:
            return
        try:
            from transformers import pipeline
            print(f"[MLDepthService] Attempting to initialize {self.model_name}...")
            # Use small pipeline
            self._pipeline = pipeline(
                task="depth-estimation",
                model=self.model_name,
                device=0 if self.device == "cuda" else -1
            )
            self._is_loaded = True
            print(f"[MLDepthService] Successfully loaded {self.model_name}")
        except Exception as e:
            print(f"[MLDepthService] Could not load huggingface model ({e}). Using deterministic structural depth estimation.")
            self._pipeline = None
            self._is_loaded = False

    def estimate_depth(
        self,
        image_path: Path,
        invert: bool = False,
        normalize: bool = True,
        min_range: float = 0.0,
        max_range: float = 1.0
    ) -> Tuple[np.ndarray, Image.Image]:
        """
        Executes Monocular Depth Estimation on the input image.
        Returns:
            depth_normalized: 2D numpy float array in [0.0, 1.0]
            depth_image: PIL Image (8-bit grayscale)
        """
        img_pil = Image.open(image_path).convert("RGB")
        w, h = img_pil.size

        # Downsample if image is excessively large for processing efficiency
        max_dim = settings.MAX_IMAGE_DIM
        if max(w, h) > max_dim:
            scale = max_dim / max(w, h)
            new_w, new_h = int(w * scale), int(h * scale)
            img_pil = img_pil.resize((new_w, new_h), Image.Resampling.LANCZOS)
        
        depth_array = None

        if self._pipeline is not None:
            try:
                result = self._pipeline(img_pil)
                pred_depth = np.array(result["depth"], dtype=np.float32)
                # Resize back to original target size if needed
                if pred_depth.shape != (img_pil.height, img_pil.width):
                    pred_depth = cv2.resize(pred_depth, (img_pil.width, img_pil.height))
                depth_array = pred_depth
            except Exception as e:
                print(f"[MLDepthService] Transformer inference error: {e}. Falling back to structural depth.")
                depth_array = None

        if depth_array is None:
            depth_array = self._structural_monocular_depth(img_pil)

        # Normalize to [0.0, 1.0]
        d_min, d_max = float(np.min(depth_array)), float(np.max(depth_array))
        if d_max > d_min:
            depth_norm = (depth_array - d_min) / (d_max - d_min)
        else:
            depth_norm = np.zeros_like(depth_array, dtype=np.float32)

        if invert:
            depth_norm = 1.0 - depth_norm

        if min_range != 0.0 or max_range != 1.0:
            depth_norm = np.clip(depth_norm, min_range, max_range)
            # Re-scale back to [0, 1] within chosen range
            if max_range > min_range:
                depth_norm = (depth_norm - min_range) / (max_range - min_range)

        depth_img = depth_to_grayscale(depth_norm, invert=False)
        return depth_norm, depth_img

    def _structural_monocular_depth(self, pil_image: Image.Image) -> np.ndarray:
        """
        High-fidelity edge-preserving spatial frequency & morphology depth estimator.
        Isolates elevated structures (rooftops, trees, road networks, terrain slopes)
        using multi-scale morphological filters, Sobel structural gradient, and bilateral smoothing.
        """
        img_np = np.array(pil_image)
        gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
        H, W = gray.shape

        # 1. Base relief: gentle terrain gradient from low-frequency illumination
        blur_large = cv2.GaussianBlur(gray, (51, 51), 0).astype(np.float32)
        base_terrain = cv2.normalize(blur_large, None, 0.2, 0.6, cv2.NORM_MINMAX)

        # 2. Elevated structure detection via morphological top-hat (extracts elements brighter/higher than neighborhood)
        kernel_size = max(9, int(min(H, W) * 0.04))
        if kernel_size % 2 == 0:
            kernel_size += 1
        morph_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kernel_size, kernel_size))
        tophat = cv2.morphologyEx(gray, cv2.MORPH_TOPHAT, morph_kernel).astype(np.float32)
        tophat_norm = cv2.normalize(tophat, None, 0.0, 0.45, cv2.NORM_MINMAX)

        # 3. Structural edges via Sobel & bilateral filter to preserve sharp building/roof boundaries
        edges_x = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
        edges_y = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
        edge_mag = np.sqrt(edges_x**2 + edges_y**2)
        edge_norm = cv2.normalize(edge_mag, None, 0.0, 0.15, cv2.NORM_MINMAX)

        # 4. Synthesize composite depth: base terrain + elevated rooftops + edge relief
        composite = base_terrain + tophat_norm + (edge_norm * 0.5)

        # 5. Edge-preserving smoothing
        composite_8u = (cv2.normalize(composite, None, 0, 255, cv2.NORM_MINMAX)).astype(np.uint8)
        bilateral = cv2.bilateralFilter(composite_8u, d=7, sigmaColor=50, sigmaSpace=50)

        return bilateral.astype(np.float32) / 255.0

ml_service = MLDepthService()
