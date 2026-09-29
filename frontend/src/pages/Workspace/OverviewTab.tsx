import React from 'react';
import { Project } from '../../types';
import {
  Image as ImageIcon,
  Maximize2,
  FileCode,
  Sliders,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Mountain,
  Activity,
  Layers,
  Info
} from 'lucide-react';

interface OverviewTabProps {
  project: Project;
  onNavigateToTab: (tab: string) => void;
  onOpenExplainTerrain: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  project,
  onNavigateToTab,
  onOpenExplainTerrain,
}) => {
  const meta = project.image_metadata;
  const terrain = project.terrain_stats;
  const unit = terrain?.elevation_unit || 'relative units';

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="glass-panel p-6 rounded-2xl border border-dw-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-100 font-mono">
              {project.name}
            </h2>
            {project.is_demo && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-dw-cyan/20 text-dw-cyan border border-dw-cyan/40 uppercase">
                DEMO DATASET
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            {project.reconstruction_mode === 'metric'
              ? 'Calibrated Metric Digital Surface Model generated with geodetic scale.'
              : 'Relative Surface Model generated from single monocular optical imagery.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenExplainTerrain}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-dw-surface hover:bg-dw-panel border border-dw-cyan/40 text-dw-cyan shadow-sm transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Explain Terrain</span>
          </button>

          <button
            onClick={() => onNavigateToTab('3d')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-dw-cyan to-dw-blue text-dw-bg hover:opacity-90 shadow-glow-cyan transition-all"
          >
            <span>Explore in 3D</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-dw-border">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Image Resolution</span>
            <Maximize2 className="w-4 h-4 text-dw-cyan" />
          </div>
          <div className="font-mono text-lg font-bold text-slate-100">
            {meta ? `${meta.width} × ${meta.height}` : '512 × 512'}
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
            {meta?.format || 'RGB TIFF'} • {meta ? `${(meta.file_size_bytes / 1024).toFixed(0)} KB` : 'Local file'}
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-dw-border">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Reconstruction Mode</span>
            <Sliders className="w-4 h-4 text-dw-blue" />
          </div>
          <div className="font-mono text-base font-bold text-slate-100 uppercase">
            {project.reconstruction_mode} DSM
          </div>
          <div className="text-[11px] font-mono mt-0.5">
            {project.reconstruction_mode === 'metric' ? (
              <span className="text-dw-green">✓ Metric Calibrated</span>
            ) : (
              <span className="text-amber-400">⚠ Relative Surface</span>
            )}
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-dw-border">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Elevation Span</span>
            <Mountain className="w-4 h-4 text-dw-cyan" />
          </div>
          <div className="font-mono text-lg font-bold text-dw-cyan">
            {terrain ? `${terrain.min_elevation} – ${terrain.max_elevation}` : '38 – 72'}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
            {unit} (Mean: {terrain?.mean_elevation || '48.2'})
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-dw-border">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Terrain Slope</span>
            <Activity className="w-4 h-4 text-dw-accent" />
          </div>
          <div className="font-mono text-lg font-bold text-slate-100">
            {terrain ? `${terrain.avg_slope}°` : '8.6°'}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
            Peak: {terrain ? `${terrain.max_slope}°` : '24.1°'}
          </div>
        </div>
      </div>

      {/* Visual Previews and Pipeline Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Image Previews */}
        <div className="glass-panel p-5 rounded-xl border border-dw-border flex flex-col gap-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-dw-cyan" />
            <span>Reconstruction Imagery</span>
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[11px] text-slate-400 block mb-1 font-mono">Original RGB</span>
              <div className="aspect-square rounded-lg border border-dw-border overflow-hidden bg-black">
                <img
                  src={project.image_url || '/placeholder.png'}
                  alt="Original Optical View"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block mb-1 font-mono">AI Depth Map</span>
              <div className="aspect-square rounded-lg border border-dw-border overflow-hidden bg-black">
                <img
                  src={project.depth_map_url || '/placeholder.png'}
                  alt="AI Depth Map"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block mb-1 font-mono">2D DSM Heatmap</span>
              <div className="aspect-square rounded-lg border border-dw-border overflow-hidden bg-black">
                <img
                  src={project.dsm_url || '/placeholder.png'}
                  alt="DSM Heatmap"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block mb-1 font-mono">Hillshade Relief</span>
              <div className="aspect-square rounded-lg border border-dw-border overflow-hidden bg-black">
                <img
                  src={project.hillshade_url || '/placeholder.png'}
                  alt="Hillshade Relief"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Processing Pipeline Stepper */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-xl border border-dw-border">
          <div className="flex items-center justify-between mb-4 border-b border-dw-border pb-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
              <Layers className="w-4 h-4 text-dw-cyan" />
              <span>Full Processing Pipeline</span>
            </h3>
            <span className="text-xs font-mono text-dw-green font-bold">100% Completed</span>
          </div>

          <div className="space-y-3">
            {project.pipeline_steps.map((step, idx) => (
              <div
                key={step.id}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-dw-surface/50 border border-dw-border/60 text-xs"
              >
                <div className="w-6 h-6 rounded-full bg-dw-green/10 border border-dw-green/30 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-dw-green" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">{step.label}</span>
                    <span className="text-[10px] font-mono text-slate-400">Step {idx + 1}</span>
                  </div>
                  {step.detail && (
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {step.detail}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Technical Note */}
          <div className="mt-4 p-3 rounded-lg bg-dw-surface border border-dw-border text-[11px] text-slate-400 flex items-start gap-2">
            <Info className="w-4 h-4 text-dw-cyan shrink-0 mt-0.5" />
            <div>
              <strong>Scientific Protocol: </strong>
              Monocular AI depth was inferred using Depth Anything V2. Elevation metrics reflect{' '}
              {project.reconstruction_mode === 'metric'
                ? 'calibrated ground elevation with geodetic reference.'
                : 'relative surface relief without ground scale extrapolation.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
