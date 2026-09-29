export type ViewMode = 'rgb' | 'depth' | 'elevation' | 'hillshade' | 'wireframe' | 'slope';

export type ToolMode = 
  | 'navigate' 
  | 'firstPerson' 
  | 'measureDistance' 
  | 'measureHeight' 
  | 'measureSlope' 
  | 'measurePoint' 
  | 'measureArea';

export interface ImageMetadata {
  filename: string;
  width: number;
  height: number;
  format: string;
  channels: number;
  file_size_bytes: number;
  is_georeferenced: boolean;
  crs?: string | null;
  bounds?: number[] | null;
  pixel_size?: number[] | null;
  has_dem: boolean;
}

export interface GCPPoint {
  id: string;
  pixel_x: number;
  pixel_y: number;
  known_elevation: number;
  predicted_elevation?: number | null;
  residual?: number | null;
}

export interface CalibrationData {
  method: 'none' | 'dem' | 'gcp';
  scale_a: number;
  offset_b: number;
  r_squared?: number | null;
  rmse?: number | null;
  status: 'uncalibrated' | 'calibrated' | 'failed';
  points: GCPPoint[];
  message?: string | null;
}

export interface TerrainStats {
  min_elevation: number;
  max_elevation: number;
  mean_elevation: number;
  min_slope: number;
  max_slope: number;
  avg_slope: number;
  slope_categories: {
    flat: number;
    low: number;
    moderate: number;
    steep: number;
    very_steep: number;
  };
  elevation_transitions: number;
  elevated_structures_detected: boolean;
  potential_inspection_regions: string[];
  resolution_m?: number | null;
  elevation_unit: string;
  is_metric: boolean;
}

export interface ValidationDistribution {
  range: string;
  bin_center: number;
  count: number;
  frequency: number;
}

export interface ValidationStats {
  has_reference: boolean;
  reference_name?: string | null;
  is_sample_data: boolean;
  rmse?: number | null;
  mae?: number | null;
  correlation?: number | null;
  error_distribution: ValidationDistribution[];
  message?: string | null;
}

export interface Measurement {
  id: string;
  type: 'distance' | 'height' | 'slope' | 'point' | 'area';
  start_point: { x: number; y: number; z: number };
  end_point?: { x: number; y: number; z: number } | null;
  value: number;
  unit: string;
  is_metric: boolean;
  details?: Record<string, any>;
  created_at: string;
}

export interface PipelineStep {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  detail?: string | null;
}

export interface Project {
  id: string;
  name: string;
  created_at: string;
  status: 'created' | 'processing' | 'ready' | 'failed';
  progress: number;
  current_step: string;
  pipeline_steps: PipelineStep[];
  reconstruction_mode: 'relative' | 'metric';
  depth_model: string;
  image_metadata?: ImageMetadata | null;
  calibration: CalibrationData;
  terrain_stats?: TerrainStats | null;
  validation: ValidationStats;
  measurements: Measurement[];
  image_url?: string | null;
  depth_map_url?: string | null;
  dsm_url?: string | null;
  hillshade_url?: string | null;
  slope_map_url?: string | null;
  mesh_url?: string | null;
  is_demo: boolean;
}

export interface HeightfieldData {
  grid_width: number;
  grid_height: number;
  aspect_ratio: number;
  min_elevation: number;
  max_elevation: number;
  elevation_span: number;
  heights: number[][];
  normalized_heights: number[][];
  is_metric: boolean;
  elevation_unit: string;
}

export interface SelectedPointInfo {
  x: number;
  y: number;
  z: number;
  elevation: number;
  relativeDepth: number;
  latitude?: number | null;
  longitude?: number | null;
  slope: number;
  aspect: number;
  isMetric: boolean;
}

export interface ExplainTerrainResponse {
  elevation_range: string;
  average_slope: number;
  maximum_slope: number;
  elevation_transitions: number;
  elevated_structures: string;
  potential_inspection_regions: string[];
  structural_detection_status: string;
  is_metric: boolean;
  summary_text: string;
}
