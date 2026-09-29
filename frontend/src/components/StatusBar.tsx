import React from 'react';
import { Project, SelectedPointInfo } from '../types';
import { Mountain, Activity, MapPin, CheckCircle, Database } from 'lucide-react';

interface StatusBarProps {
  project?: Project | null;
  hoveredPoint?: { x: number; y: number; elevation: number } | null;
  selectedPoint?: SelectedPointInfo | null;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  project,
  hoveredPoint,
  selectedPoint,
}) => {
  if (!project) return null;

  const t = project.terrain_stats;
  const isMetric = t?.is_metric ?? false;
  const unit = isMetric ? 'm' : 'rel units';

  // Display elevation from active selection or terrain summary
  const displayElevation = selectedPoint
    ? `${selectedPoint.elevation} ${selectedPoint.isMetric ? 'm' : 'rel units'}`
    : hoveredPoint
    ? `${hoveredPoint.elevation.toFixed(1)} ${unit}`
    : t
    ? `${t.mean_elevation} ${unit} (avg)`
    : 'N/A';

  const displaySlope = selectedPoint
    ? `${selectedPoint.slope}°`
    : t
    ? `${t.avg_slope}° (avg)`
    : 'N/A';

  const displayCoords = selectedPoint?.latitude && selectedPoint?.longitude
    ? `${selectedPoint.latitude}°, ${selectedPoint.longitude}°`
    : project.image_metadata?.crs
    ? project.image_metadata.crs
    : 'Image Plane (Non-georeferenced)';

  return (
    <footer className="h-8 border-t border-dw-border bg-dw-surface/95 px-4 flex items-center justify-between text-[11px] font-mono select-none text-slate-400 z-30">
      {/* Left metrics */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-1.5">
          <Mountain className="w-3.5 h-3.5 text-dw-cyan" />
          <span>Elevation:</span>
          <span className="font-bold text-slate-200">{displayElevation}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-dw-blue" />
          <span>Slope:</span>
          <span className="font-bold text-slate-200">{displaySlope}</span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 max-w-[200px] md:max-w-xs truncate">
          <MapPin className="w-3.5 h-3.5 text-dw-accent shrink-0" />
          <span className="shrink-0">Ref:</span>
          <span className="font-medium text-slate-300 truncate">{displayCoords}</span>
        </div>
      </div>

      {/* Right status */}
      <div className="flex items-center gap-3 sm:gap-5">
        <div className="hidden sm:flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-slate-400" />
          <span>DSM:</span>
          <span className={project.dsm_url ? 'text-dw-green font-bold' : 'text-slate-500'}>
            {project.dsm_url ? '✓ Active' : '○ Pending'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              project.status === 'ready'
                ? 'bg-dw-green shadow-glow-cyan'
                : project.status === 'processing'
                ? 'bg-dw-cyan animate-ping'
                : 'bg-dw-amber'
            }`}
          />
          <span className="capitalize text-slate-300">
            {project.current_step || project.status}
          </span>
        </div>
      </div>
    </footer>
  );
};
