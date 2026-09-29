import React from 'react';
import { ExplainTerrainResponse } from '../types';
import { Sparkles, X, AlertTriangle, ShieldCheck, Activity, MapPin } from 'lucide-react';

interface TerrainInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  insights: ExplainTerrainResponse | null;
  isLoading: boolean;
}

export const TerrainInsightsModal: React.FC<TerrainInsightsModalProps> = ({
  isOpen,
  onClose,
  insights,
  isLoading,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="glass-panel-glow w-full max-w-xl rounded-2xl p-6 border border-dw-cyan/40 shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-dw-border pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-dw-cyan/10 border border-dw-cyan/30 text-dw-cyan">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 font-mono">
                AI TERRAIN INSIGHTS
              </h3>
              <p className="text-xs text-slate-400">
                Mathematical surface analysis & topography gradients
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-dw-surface"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-dw-cyan border-t-transparent animate-spin" />
            <span className="text-xs font-mono text-slate-400">
              Computing geometric surface gradients & transition levels...
            </span>
          </div>
        ) : insights ? (
          <div className="space-y-4">
            {/* Summary Banner */}
            <div className="p-3 rounded-lg bg-dw-surface border border-dw-border text-xs text-slate-300 leading-relaxed font-sans">
              {insights.summary_text}
            </div>

            {/* Core Calculated Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="glass-panel p-3 rounded-lg border border-dw-border">
                <span className="text-slate-400 text-[11px] block uppercase font-mono">
                  Elevation Range
                </span>
                <span className="text-sm font-bold text-dw-cyan mt-1 block">
                  {insights.elevation_range}
                </span>
              </div>

              <div className="glass-panel p-3 rounded-lg border border-dw-border">
                <span className="text-slate-400 text-[11px] block uppercase font-mono">
                  Average / Max Slope
                </span>
                <span className="text-sm font-bold text-slate-200 mt-1 block">
                  {insights.average_slope.toFixed(1)}° / {insights.maximum_slope.toFixed(1)}°
                </span>
              </div>

              <div className="glass-panel p-3 rounded-lg border border-dw-border">
                <span className="text-slate-400 text-[11px] block uppercase font-mono">
                  Elevation Transitions
                </span>
                <span className="text-sm font-bold text-dw-green mt-1 block">
                  {insights.elevation_transitions} distinct contour levels
                </span>
              </div>

              <div className="glass-panel p-3 rounded-lg border border-dw-border">
                <span className="text-slate-400 text-[11px] block uppercase font-mono">
                  Elevated Structures
                </span>
                <span className="text-xs font-semibold text-slate-200 mt-1 block">
                  {insights.elevated_structures}
                </span>
              </div>
            </div>

            {/* Potential Inspection Regions */}
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide mb-2 flex items-center gap-1.5 font-mono">
                <MapPin className="w-3.5 h-3.5 text-dw-cyan" />
                <span>Potential Inspection Regions</span>
              </h4>
              <div className="space-y-1.5">
                {insights.potential_inspection_regions.map((region, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded bg-dw-surface/70 border border-dw-border text-xs text-slate-300 flex items-start gap-2"
                  >
                    <span className="text-dw-cyan font-mono font-bold">{idx + 1}.</span>
                    <span>{region}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Technical Honesty Disclaimer */}
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Honesty Disclosure: </strong>
                {insights.structural_detection_status}. Insights are computed directly from reconstructed elevation gradients without fabricating object classes.
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
