from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

class ImageMetadata(BaseModel):
    filename: str
    width: int
    height: int
    format: str
    channels: int
    file_size_bytes: int
    is_georeferenced: bool = False
    crs: Optional[str] = None
    bounds: Optional[List[float]] = None  # [min_x, min_y, max_x, max_y]
    pixel_size: Optional[List[float]] = None  # [pixel_size_x, pixel_size_y]
    has_dem: bool = False

class GCPPoint(BaseModel):
    id: str
    pixel_x: int
    pixel_y: int
    known_elevation: float
    predicted_elevation: Optional[float] = None
    residual: Optional[float] = None

class CalibrationData(BaseModel):
    method: str = "none"  # "none", "dem", "gcp"
    scale_a: float = 1.0
    offset_b: float = 0.0
    r_squared: Optional[float] = None
    rmse: Optional[float] = None
    status: str = "uncalibrated"  # "uncalibrated", "calibrated", "failed"
    points: List[GCPPoint] = []
    message: Optional[str] = None

class TerrainStats(BaseModel):
    min_elevation: float
    max_elevation: float
    mean_elevation: float
    min_slope: float
    max_slope: float
    avg_slope: float
    slope_categories: Dict[str, float] = {}  # flat, low, moderate, steep, very_steep
    elevation_transitions: int = 0
    elevated_structures_detected: bool = False
    potential_inspection_regions: List[str] = []
    resolution_m: Optional[float] = None
    elevation_unit: str = "relative units"  # "meters" or "relative units"
    is_metric: bool = False

class ValidationStats(BaseModel):
    has_reference: bool = False
    reference_name: Optional[str] = None
    is_sample_data: bool = False
    rmse: Optional[float] = None
    mae: Optional[float] = None
    correlation: Optional[float] = None
    error_distribution: List[Dict[str, Any]] = []
    message: Optional[str] = None

class Measurement(BaseModel):
    id: str
    type: str  # "distance", "height", "slope", "point", "area"
    start_point: Dict[str, float]
    end_point: Optional[Dict[str, float]] = None
    value: float
    unit: str
    is_metric: bool = False
    details: Dict[str, Any] = {}
    created_at: str

class PipelineStep(BaseModel):
    id: str
    label: str
    status: str = "pending"  # "pending", "in_progress", "completed", "failed"
    detail: Optional[str] = None

class Project(BaseModel):
    id: str
    name: str
    created_at: str
    status: str = "created"  # "created", "processing", "ready", "failed"
    progress: int = 0
    current_step: str = ""
    pipeline_steps: List[PipelineStep] = []
    reconstruction_mode: str = "relative"  # "relative" | "metric"
    depth_model: str = "Depth Anything V2"
    image_metadata: Optional[ImageMetadata] = None
    calibration: CalibrationData = Field(default_factory=CalibrationData)
    terrain_stats: Optional[TerrainStats] = None
    validation: ValidationStats = Field(default_factory=ValidationStats)
    measurements: List[Measurement] = []
    
    # Static asset endpoints
    image_url: Optional[str] = None
    depth_map_url: Optional[str] = None
    dsm_url: Optional[str] = None
    hillshade_url: Optional[str] = None
    slope_map_url: Optional[str] = None
    mesh_url: Optional[str] = None
    is_demo: bool = False

class ProjectCreateRequest(BaseModel):
    name: str
    reconstruction_mode: Optional[str] = "relative"

class CalibrationRequest(BaseModel):
    method: str = "gcp"  # "gcp" or "dem"
    gcp_points: Optional[List[GCPPoint]] = None
    dem_file_id: Optional[str] = None

class MeasureRequest(BaseModel):
    type: str  # "distance", "height", "slope", "point", "area"
    start_point: Dict[str, float]
    end_point: Optional[Dict[str, float]] = None
    polygon_points: Optional[List[Dict[str, float]]] = None

class ExplainTerrainResponse(BaseModel):
    elevation_range: str
    average_slope: float
    maximum_slope: float
    elevation_transitions: int
    elevated_structures: str
    potential_inspection_regions: List[str]
    structural_detection_status: str
    is_metric: bool
    summary_text: str
