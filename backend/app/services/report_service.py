from typing import Dict, Any
from app.schemas.project import Project

class ReportService:
    @staticmethod
    def generate_report_dict(project: Project) -> Dict[str, Any]:
        """
        Compiles the structured analysis report for the project.
        """
        meta = project.image_metadata
        terrain = project.terrain_stats
        calib = project.calibration
        val = project.validation

        return {
            "title": "DEPTHWIZARD Elevation Analysis Report",
            "project_id": project.id,
            "project_name": project.name,
            "generated_at": project.created_at,
            "executive_summary": (
                f"Project '{project.name}' processed in {project.reconstruction_mode.upper()} mode "
                f"using {project.depth_model}. "
                f"{'Metric calibration established via ' + calib.method.upper() + '.' if calib.status == 'calibrated' else 'Operating on relative elevation surface (unreferenced).'}"
            ),
            "image_specifications": {
                "filename": meta.filename if meta else "N/A",
                "dimensions": f"{meta.width} × {meta.height}" if meta else "N/A",
                "format": meta.format if meta else "N/A",
                "is_georeferenced": meta.is_georeferenced if meta else False,
                "crs": meta.crs if meta and meta.crs else "Unprojected / Local Image Plane",
            },
            "reconstruction_parameters": {
                "mode": project.reconstruction_mode,
                "ai_depth_model": project.depth_model,
                "calibration_method": calib.method,
                "calibration_status": calib.status,
                "scale_factor_a": calib.scale_a,
                "offset_b": calib.offset_b,
                "gcp_count": len(calib.points) if calib.points else 0
            },
            "elevation_metrics": {
                "unit": terrain.elevation_unit if terrain else "relative units",
                "is_metric": terrain.is_metric if terrain else False,
                "min_elevation": terrain.min_elevation if terrain else 0.0,
                "max_elevation": terrain.max_elevation if terrain else 0.0,
                "mean_elevation": terrain.mean_elevation if terrain else 0.0,
                "elevation_transitions": terrain.elevation_transitions if terrain else 0,
            },
            "slope_metrics": {
                "min_slope_deg": terrain.min_slope if terrain else 0.0,
                "max_slope_deg": terrain.max_slope if terrain else 0.0,
                "avg_slope_deg": terrain.avg_slope if terrain else 0.0,
                "slope_distribution": terrain.slope_categories if terrain else {}
            },
            "validation_metrics": {
                "status": "Available" if val.has_reference else "Unavailable (No reference DSM)",
                "reference_name": val.reference_name,
                "is_sample_dataset": val.is_sample_data,
                "rmse": val.rmse,
                "mae": val.mae,
                "correlation": val.correlation
            },
            "measurements": [
                {
                    "id": m.id,
                    "type": m.type,
                    "value": m.value,
                    "unit": m.unit,
                    "is_metric": m.is_metric,
                    "details": m.details
                }
                for m in project.measurements
            ],
            "inspection_regions": terrain.potential_inspection_regions if terrain else []
        }

    @staticmethod
    def generate_report_html(report_data: Dict[str, Any]) -> str:
        """
        Generates clean, printable HTML report with dark styling and scientific layout.
        """
        p_name = report_data["project_name"]
        elev = report_data["elevation_metrics"]
        slope = report_data["slope_metrics"]
        val = report_data["validation_metrics"]
        img = report_data["image_specifications"]
        cal = report_data["reconstruction_parameters"]

        gcp_rows = ""
        for m in report_data.get("measurements", []):
            gcp_rows += f"<tr><td>{m['type'].upper()}</td><td>{m['value']} {m['unit']}</td><td>{'Calibrated' if m['is_metric'] else 'Relative'}</td></tr>"
        if not gcp_rows:
            gcp_rows = "<tr><td colspan='3'>No recorded user measurements.</td></tr>"

        html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>DepthWizard Report - {p_name}</title>
  <style>
    body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #070B13; color: #E2E8F0; padding: 40px; line-height: 1.6; }}
    .header {{ border-bottom: 2px solid #00E5FF; padding-bottom: 20px; margin-bottom: 30px; }}
    h1 {{ color: #00E5FF; margin: 0; font-size: 26px; }}
    .subtitle {{ color: #94A3B8; font-size: 14px; margin-top: 5px; }}
    .section {{ background: #0D1525; border: 1px solid #1E2D4A; border-radius: 8px; padding: 20px; margin-bottom: 25px; }}
    .section-title {{ color: #38BDF8; font-size: 18px; margin-top: 0; border-bottom: 1px solid #1E2D4A; padding-bottom: 8px; }}
    .grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 15px; }}
    .stat-card {{ background: #131F37; padding: 12px; border-radius: 6px; }}
    .stat-label {{ font-size: 12px; color: #94A3B8; text-transform: uppercase; }}
    .stat-value {{ font-size: 20px; font-weight: bold; color: #00E5FF; margin-top: 4px; }}
    table {{ width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; }}
    th, td {{ padding: 10px; text-align: left; border-bottom: 1px solid #1E2D4A; }}
    th {{ background: #131F37; color: #94A3B8; }}
    .badge {{ display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; }}
    .badge-metric {{ background: rgba(0, 230, 118, 0.2); color: #00E676; border: 1px solid #00E676; }}
    .badge-relative {{ background: rgba(255, 179, 0, 0.2); color: #FFB300; border: 1px solid #FFB300; }}
  </style>
</head>
<body>
  <div class="header">
    <h1>DEPTHWIZARD</h1>
    <div class="subtitle">AI-Powered Single-View 3D Reconstruction & Elevation Analysis Report</div>
    <div style="margin-top: 10px;">
      <strong>Project:</strong> {p_name} | <strong>Mode:</strong> 
      <span class="badge {'badge-metric' if elev['is_metric'] else 'badge-relative'}">
        {report_data['reconstruction_parameters']['mode'].upper()} DSM
      </span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Summary & Imagery</div>
    <p>{report_data['executive_summary']}</p>
    <div class="grid">
      <div class="stat-card">
        <div class="stat-label">File Dimensions</div>
        <div class="stat-value">{img['dimensions']}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Format / Channels</div>
        <div class="stat-value">{img['format']}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Georeferenced CRS</div>
        <div class="stat-value" style="font-size: 14px;">{img['crs']}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Elevation & Terrain Analysis</div>
    <div class="grid">
      <div class="stat-card">
        <div class="stat-label">Min Elevation</div>
        <div class="stat-value">{elev['min_elevation']} <span style="font-size:12px;">{elev['unit']}</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Max Elevation</div>
        <div class="stat-value">{elev['max_elevation']} <span style="font-size:12px;">{elev['unit']}</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Mean Elevation</div>
        <div class="stat-value">{elev['mean_elevation']} <span style="font-size:12px;">{elev['unit']}</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Average Slope</div>
        <div class="stat-value">{slope['avg_slope_deg']}°</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Maximum Slope</div>
        <div class="stat-value">{slope['max_slope_deg']}°</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">AI Depth Model</div>
        <div class="stat-value" style="font-size: 16px;">{cal['ai_depth_model']}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Calibration & Validation</div>
    <p><strong>Calibration:</strong> {cal['calibration_method'].upper()} ({cal['calibration_status']}) | Formula: H = {cal['scale_factor_a']:.3f}·D + {cal['offset_b']:.2f}</p>
    <div class="grid">
      <div class="stat-card">
        <div class="stat-label">Validation Status</div>
        <div class="stat-value" style="font-size: 15px;">{val['status']}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">RMSE</div>
        <div class="stat-value">{val['rmse'] if val['rmse'] is not None else 'N/A'} <span style="font-size:12px;">m</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Correlation (r)</div>
        <div class="stat-value">{val['correlation'] if val['correlation'] is not None else 'N/A'}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Measurements Log</div>
    <table>
      <thead>
        <tr><th>Type</th><th>Value</th><th>Scale Reference</th></tr>
      </thead>
      <tbody>
        {gcp_rows}
      </tbody>
    </table>
  </div>
</body>
</html>"""
        return html

report_service = ReportService()
