import React, { useState } from 'react';
import { Project } from '../../types';
import { ComparisonSlider } from '../../components/ComparisonSlider';
import { api } from '../../api/client';
import { Sliders, RefreshCw, AlertTriangle, Cpu, Layers, ArrowRight } from 'lucide-react';

interface AnalysisTabProps {
  project: Project;
  onProjectUpdated: (project: Project) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const AnalysisTab: React.FC<AnalysisTabProps> = ({
  project,
  onProjectUpdated,
  onNavigateToTab,
}) => {
  const [invertDepth, setInvertDepth] = useState(false);
  const [normalizeDepth, setNormalizeDepth] = useState(true);
  const [opacity, setOpacity] = useState(100);
  const [minRange, setMinRange] = useState(0);
  const [maxRange, setMaxRange] = useState(100);
  const [isReprocessing, setIsReprocessing] = useState(false);

  const handleApplyControls = async () => {
    try {
      setIsReprocessing(true);
      const updated = await api.reprocess(project.id, invertDepth, normalizeDepth);
      onProjectUpdated(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setIsReprocessing(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100 font-mono">
            AI MONOCULAR DEPTH ESTIMATION
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Original Optical Sensor vs. Relative Disparity Inferred via Depth Anything V2
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Technical Honesty Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Depth Type: Relative Disparity</span>
          </div>

          {onNavigateToTab && (
            <button
              onClick={() => onNavigateToTab('elevation')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-dw-cyan to-dw-blue text-dw-bg hover:opacity-90 shadow-glow-cyan transition-all font-mono"
            >
              <span>Next: Elevation & DSM</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Draggable Comparison Slider */}
      <div className="space-y-2">
        <ComparisonSlider
          leftImage={project.image_url || '/placeholder.png'}
          rightImage={project.depth_map_url || '/placeholder.png'}
          leftLabel="ORIGINAL OPTICAL IMAGE"
          rightLabel="INFERRED AI DEPTH MAP"
          rightStyle={{
            opacity: opacity / 100,
            filter: `contrast(${1 + (maxRange - minRange - 100) / 200}) brightness(${1 + minRange / 200})`,
          }}
        />
        <p className="text-[11px] font-mono text-slate-500 text-center">
          Drag the center handle horizontally to compare optical textures with structural depth relief.
        </p>
      </div>

      {/* Controls & Model Specs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Depth Map Controls */}
        <div className="md:col-span-2 glass-panel p-5 rounded-xl border border-dw-border space-y-4">
          <div className="flex items-center justify-between border-b border-dw-border pb-2">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
              <Sliders className="w-4 h-4 text-dw-cyan" />
              <span>Depth Map Adjustments</span>
            </h3>
            <button
              onClick={handleApplyControls}
              disabled={isReprocessing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-dw-cyan/20 text-dw-cyan hover:bg-dw-cyan/30 border border-dw-cyan/50 disabled:opacity-50 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReprocessing ? 'animate-spin' : ''}`} />
              <span>{isReprocessing ? 'Re-evaluating...' : 'Apply Filters'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            {/* Invert Depth Toggle */}
            <div className="p-3 rounded-lg bg-dw-surface border border-dw-border flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-200 block">Invert Depth Map</span>
                <span className="text-[11px] text-slate-400">Reverse near/far polarity</span>
              </div>
              <input
                type="checkbox"
                checked={invertDepth}
                onChange={(e) => setInvertDepth(e.target.checked)}
                className="w-4 h-4 rounded text-dw-cyan accent-dw-cyan cursor-pointer"
              />
            </div>

            {/* Normalize Depth */}
            <div className="p-3 rounded-lg bg-dw-surface border border-dw-border flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-200 block">Auto-Normalize</span>
                <span className="text-[11px] text-slate-400">Scale range to [0.0, 1.0]</span>
              </div>
              <input
                type="checkbox"
                checked={normalizeDepth}
                onChange={(e) => setNormalizeDepth(e.target.checked)}
                className="w-4 h-4 rounded text-dw-cyan accent-dw-cyan cursor-pointer"
              />
            </div>

            {/* Opacity Slider */}
            <div className="p-3 rounded-lg bg-dw-surface border border-dw-border space-y-1.5">
              <div className="flex justify-between text-slate-300">
                <span>Display Opacity</span>
                <span className="font-mono text-dw-cyan">{opacity}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={opacity}
                onChange={(e) => setOpacity(parseInt(e.target.value))}
                className="w-full h-1.5 bg-dw-panel rounded cursor-pointer"
              />
            </div>

            {/* Min/Max Range Sliders */}
            <div className="p-3 rounded-lg bg-dw-surface border border-dw-border space-y-1.5">
              <div className="flex justify-between text-slate-300">
                <span>Dynamic Range Clamp</span>
                <span className="font-mono text-dw-cyan">{minRange}% – {maxRange}%</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={minRange}
                  onChange={(e) => setMinRange(parseInt(e.target.value))}
                  className="w-1/2 h-1.5 bg-dw-panel rounded cursor-pointer"
                />
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={maxRange}
                  onChange={(e) => setMaxRange(parseInt(e.target.value))}
                  className="w-1/2 h-1.5 bg-dw-panel rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Depth Engine Metadata */}
        <div className="glass-panel p-5 rounded-xl border border-dw-border space-y-4">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2 border-b border-dw-border pb-2">
            <Cpu className="w-4 h-4 text-dw-cyan" />
            <span>AI Pipeline Specifications</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Depth Architecture</span>
              <span className="font-bold text-dw-cyan text-sm">{project.depth_model}</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Inference Status</span>
              <span className="font-bold text-dw-green flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-dw-green" />
                Completed (Deterministic Grid)
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Elevation Classification</span>
              <span className="font-bold text-slate-200">
                {project.reconstruction_mode === 'metric' ? 'Metric DSM (Calibrated)' : 'Relative Surface (Unreferenced)'}
              </span>
            </div>

            <div className="pt-2 border-t border-dw-border/60 text-[11px] text-slate-400 leading-normal">
              Depth values represent normalized spatial disparity. True physical elevation in meters requires geospatial tie-points or a calibrated DEM in the Elevation workspace.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
