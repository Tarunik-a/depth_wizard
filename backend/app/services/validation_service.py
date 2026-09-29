from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple
import numpy as np

from app.schemas.project import ValidationStats

class ValidationService:
    @staticmethod
    def calculate_validation(
        predicted_dsm: np.ndarray,
        reference_dsm: Optional[np.ndarray],
        is_sample_data: bool = False,
        reference_name: Optional[str] = None
    ) -> ValidationStats:
        """
        Validates the predicted DSM against a ground-truth reference DSM.
        Strictly requires actual reference data. If no reference DSM is present,
        honestly reports that validation is unavailable.
        """
        if reference_dsm is None:
            return ValidationStats(
                has_reference=False,
                reference_name=None,
                is_sample_data=is_sample_data,
                rmse=None,
                mae=None,
                correlation=None,
                error_distribution=[],
                message="Validation unavailable — upload a reference DSM."
            )

        # Match dimensions if needed
        if predicted_dsm.shape != reference_dsm.shape:
            import cv2
            ref_aligned = cv2.resize(reference_dsm, (predicted_dsm.shape[1], predicted_dsm.shape[0]))
        else:
            ref_aligned = reference_dsm

        diff = predicted_dsm - ref_aligned
        abs_diff = np.abs(diff)

        rmse = float(np.sqrt(np.mean(diff ** 2)))
        mae = float(np.mean(abs_diff))

        # Pearson correlation
        p_flat = predicted_dsm.flatten()
        r_flat = ref_aligned.flatten()
        std_p = np.std(p_flat)
        std_r = np.std(r_flat)
        if std_p > 1e-6 and std_r > 1e-6:
            corr = float(np.corrcoef(p_flat, r_flat)[0, 1])
        else:
            corr = 1.0

        # Calculate error distribution histogram (10 bins)
        hist, bin_edges = np.histogram(diff, bins=10)
        distribution = []
        for i in range(len(hist)):
            distribution.append({
                "range": f"{bin_edges[i]:.1f} to {bin_edges[i+1]:.1f}",
                "bin_center": round(float((bin_edges[i] + bin_edges[i+1]) / 2.0), 2),
                "count": int(hist[i]),
                "frequency": round(float(hist[i] / diff.size * 100), 2)
            })

        return ValidationStats(
            has_reference=True,
            reference_name=reference_name or ("Built-in LiDAR Reference" if is_sample_data else "User Reference DSM"),
            is_sample_data=is_sample_data,
            rmse=round(rmse, 2),
            mae=round(mae, 2),
            correlation=round(corr, 3),
            error_distribution=distribution,
            message="Validation completed successfully against reference ground truth."
        )

validation_service = ValidationService()
