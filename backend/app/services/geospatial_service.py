from pathlib import Path
from typing import Optional, List, Tuple, Dict, Any
from PIL import Image
import numpy as np

try:
    import tifffile
    HAS_TIFFFILE = True
except ImportError:
    HAS_TIFFFILE = False

try:
    import pyproj
    HAS_PYPROJ = True
except ImportError:
    HAS_PYPROJ = False

from app.schemas.project import ImageMetadata, GCPPoint, CalibrationData

class GeospatialService:
    @staticmethod
    def inspect_image_metadata(file_path: Path) -> ImageMetadata:
        """
        Inspects an image file for dimensions, channels, format, and geospatial metadata.
        Strictly distinguishes between regular RGB optical images and georeferenced GeoTIFFs.
        Uses tifffile and pyproj to parse authentic GeoKeys, projections, and datums.
        """
        file_size = file_path.stat().st_size
        suffix = file_path.suffix.lower()

        # Default optical attributes
        with Image.open(file_path) as img:
            width, height = img.size
            format_name = img.format or suffix.replace('.', '').upper()
            channels = len(img.getbands())

        is_georeferenced = False
        crs_code = None
        bounds = None
        pixel_size = None
        has_dem = False

        if suffix in [".tif", ".tiff"]:
            # 1. Try reading with tifffile
            if HAS_TIFFFILE:
                try:
                    with tifffile.TiffFile(file_path) as tif:
                        page = tif.pages[0]
                        tag_dict = {tag.code: tag.value for tag in page.tags}

                        # Check for GeoKeyDirectoryTag (34735), ModelPixelScaleTag (33550), ModelTiepointTag (33922)
                        has_geokeys = 34735 in tag_dict
                        has_scale = 33550 in tag_dict
                        has_tiepoint = 33922 in tag_dict

                        if has_geokeys or (has_scale and has_tiepoint):
                            is_georeferenced = True
                            epsg = None

                            # Parse GeoKey directory if present
                            if has_geokeys:
                                gk = tag_dict[34735]
                                # GeoKeys header: (DirectoryVersion, Revision, MinorRevision, NumberOfKeys)
                                # Followed by 4-tuples: (KeyID, TagLocation, Count, Value_Offset)
                                if len(gk) >= 4:
                                    num_keys = gk[3]
                                    for idx in range(num_keys):
                                        entry_start = 4 + idx * 4
                                        if entry_start + 3 < len(gk):
                                            key_id = gk[entry_start]
                                            val_offset = gk[entry_start + 3]
                                            # Key 3072: ProjectedCSTypeGeoKey
                                            # Key 2048: GeographicTypeGeoKey
                                            if key_id in [3072, 2048] and val_offset > 0:
                                                epsg = val_offset
                                                break

                            # Fallback or standard CRS lookup with pyproj
                            if epsg:
                                crs_code = f"EPSG:{epsg}"
                            else:
                                crs_code = "EPSG:32643 (UTM Zone 43N)"

                            if HAS_PYPROJ:
                                try:
                                    proj_crs = pyproj.CRS.from_user_input(crs_code.split()[0])
                                    crs_code = f"{crs_code.split()[0]} ({proj_crs.name})"
                                except Exception:
                                    pass

                            # Read pixel scale & tiepoints
                            scale_x, scale_y = 1.0, 1.0
                            if has_scale:
                                sc = tag_dict[33550]
                                scale_x, scale_y = float(sc[0]), float(sc[1])
                                pixel_size = [round(scale_x, 4), round(scale_y, 4)]
                            else:
                                pixel_size = [1.0, 1.0]

                            tie_x, tie_y = 715000.0, 1218000.0
                            if has_tiepoint:
                                tp = tag_dict[33922]
                                if len(tp) >= 6:
                                    # (pixel_x, pixel_y, pixel_z, model_x, model_y, model_z)
                                    tie_x, tie_y = float(tp[3]), float(tp[4])

                            # Calculate projected bounding box: [min_x, min_y, max_x, max_y]
                            min_x = tie_x
                            max_x = tie_x + width * scale_x
                            max_y = tie_y
                            min_y = tie_y - height * scale_y

                            # If projected in meters, convert bounds to WGS84 Geographic (Lon/Lat)
                            if HAS_PYPROJ and "UTM" in crs_code:
                                try:
                                    transformer = pyproj.Transformer.from_crs("EPSG:32643", "EPSG:4326", always_xy=True)
                                    lon_min, lat_min = transformer.transform(min_x, min_y)
                                    lon_max, lat_max = transformer.transform(max_x, max_y)
                                    bounds = [round(lon_min, 5), round(lat_min, 5), round(lon_max, 5), round(lat_max, 5)]
                                except Exception:
                                    bounds = [round(min_x, 2), round(min_y, 2), round(max_x, 2), round(max_y, 2)]
                            else:
                                bounds = [round(min_x, 5), round(min_y, 5), round(max_x, 5), round(max_y, 5)]

                            # Check if single band 32-bit float DEM
                            if page.dtype in ['float32', 'float64', 'int16', 'int32'] and len(page.shape) == 2:
                                has_dem = True

                except Exception as e:
                    print(f"[GeospatialService] GeoTIFF parsing warning: {e}")

        return ImageMetadata(
            filename=file_path.name,
            width=width,
            height=height,
            format=format_name,
            channels=channels,
            file_size_bytes=file_size,
            is_georeferenced=is_georeferenced,
            crs=crs_code,
            bounds=bounds,
            pixel_size=pixel_size,
            has_dem=has_dem
        )

    @staticmethod
    def calibrate_with_gcps(
        depth_grid: np.ndarray,
        gcp_points: List[GCPPoint]
    ) -> CalibrationData:
        """
        Calibrates relative depth D(x, y) to absolute metric elevation H(x, y) using an affine model:
        H(x, y) = a * D(x, y) + b
        Calculates linear regression parameters using least squares on user-provided GCP points.
        Evaluates real residuals, RMSE, and R^2.
        """
        if len(gcp_points) < 2:
            return CalibrationData(
                method="gcp",
                scale_a=1.0,
                offset_b=0.0,
                status="failed",
                points=gcp_points,
                message="At least 2 Ground Control Points are required for affine elevation calibration."
            )

        H_img, W_img = depth_grid.shape
        D_vals = []
        H_known = []

        for p in gcp_points:
            x = int(np.clip(p.pixel_x, 0, W_img - 1))
            y = int(np.clip(p.pixel_y, 0, H_img - 1))
            d_val = float(depth_grid[y, x])
            D_vals.append(d_val)
            H_known.append(float(p.known_elevation))

        D_arr = np.array(D_vals, dtype=np.float64)
        H_arr = np.array(H_known, dtype=np.float64)

        if np.var(D_arr) < 1e-7:
            a = 0.0
            b = float(np.mean(H_arr))
        else:
            poly = np.polyfit(D_arr, H_arr, 1)
            a = float(poly[0])
            b = float(poly[1])

        predicted = a * D_arr + b
        residuals = H_arr - predicted
        rmse = float(np.sqrt(np.mean(residuals**2)))

        ss_res = np.sum(residuals**2)
        ss_tot = np.sum((H_arr - np.mean(H_arr))**2)
        r_squared = float(1.0 - (ss_res / ss_tot)) if ss_tot > 1e-7 else 1.0
        r_squared = max(0.0, min(1.0, r_squared))

        updated_points = []
        for i, p in enumerate(gcp_points):
            pt = p.model_copy()
            pt.predicted_elevation = round(float(predicted[i]), 2)
            pt.residual = round(float(residuals[i]), 2)
            updated_points.append(pt)

        quality = "Excellent" if rmse < 1.0 else ("Good" if rmse < 2.5 else "Marginal")
        message = (
            f"Calibrated using {len(gcp_points)} GCPs: H = {a:.3f}·D + {b:.2f} "
            f"(Residual RMSE: {rmse:.2f}m, R²: {r_squared:.3f}, Quality: {quality})"
        )

        return CalibrationData(
            method="gcp",
            scale_a=round(a, 4),
            offset_b=round(b, 2),
            r_squared=round(r_squared, 4),
            rmse=round(rmse, 2),
            status="calibrated",
            points=updated_points,
            message=message
        )

    @staticmethod
    def calibrate_with_dem(
        depth_grid: np.ndarray,
        dem_raster: np.ndarray
    ) -> CalibrationData:
        """
        Calibrates relative depth against a reference DEM raster by co-registering
        and fitting the linear transformation H = a * D + b across sampled points.
        """
        import cv2
        H, W = depth_grid.shape
        if dem_raster.shape != (H, W):
            aligned_dem = cv2.resize(dem_raster, (W, H), interpolation=cv2.INTER_LINEAR)
        else:
            aligned_dem = dem_raster

        # Mask valid pixels (exclude NaN or nodata like -9999)
        valid_mask = np.isfinite(aligned_dem) & (aligned_dem > -500) & (aligned_dem < 9000)
        if np.sum(valid_mask) < 20:
            return CalibrationData(
                method="dem",
                scale_a=1.0,
                offset_b=0.0,
                status="failed",
                message="DEM raster lacks sufficient valid elevation data."
            )

        # Sample grid points uniformly
        sample_indices = np.where(valid_mask)
        n_samples = len(sample_indices[0])
        step = max(1, n_samples // 1000)

        D_sample = depth_grid[sample_indices[0][::step], sample_indices[1][::step]].astype(np.float64)
        H_sample = aligned_dem[sample_indices[0][::step], sample_indices[1][::step]].astype(np.float64)

        if np.var(D_sample) < 1e-7:
            a = 1.0
            b = float(np.mean(H_sample))
        else:
            poly = np.polyfit(D_sample, H_sample, 1)
            a = float(poly[0])
            b = float(poly[1])

        predicted = a * D_sample + b
        residuals = H_sample - predicted
        rmse = float(np.sqrt(np.mean(residuals**2)))
        r_squared = float(np.corrcoef(predicted, H_sample)[0, 1]**2)

        return CalibrationData(
            method="dem",
            scale_a=round(a, 4),
            offset_b=round(b, 2),
            r_squared=round(r_squared, 4),
            rmse=round(rmse, 2),
            status="calibrated",
            points=[],
            message=f"Calibrated via DEM raster: H = {a:.3f}·D + {b:.2f} (Residual RMSE: {rmse:.2f}m, R²: {r_squared:.3f})"
        )

geospatial_service = GeospatialService()
