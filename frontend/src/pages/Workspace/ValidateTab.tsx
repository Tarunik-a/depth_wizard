import React from 'react';
import { Project } from '../../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import {
  CheckCircle2,
  AlertTriangle,
  Upload,
  Layers,
  Activity,
  FileCheck,
  TrendingDown
} from 'lucide-react';

interface ValidateTabProps {
  project: Project;
}

export const ValidateTab: React.FC<ValidateTabProps> = ({ project }) => {
  const val = project.validation;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-100 font-mono">
              DSM ACCURACY VALIDATION BENCHMARK
            </h2>
            {val.is_sample_data && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-dw-cyan/20 text-dw-cyan border border-dw-cyan/40 uppercase">
                SAMPLE DATASET
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Statistical deviation and error analysis against high-precision reference ground truth
          </p>
        </div>

        {val.has_reference ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dw-green/10 border border-dw-green/30 text-dw-green text-xs font-mono font-semibold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Reference Ground Truth Co-registered</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Reference Data Required</span>
          </div>
        )}
      </div>

      {val.has_reference ? (
        <>
          {/* Validation Metrics KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-panel p-5 rounded-xl border border-dw-border">
              <span className="text-slate-400 text-xs font-mono block uppercase">
                Root Mean Square Error (RMSE)
              </span>
              <div className="font-mono text-3xl font-black text-dw-cyan mt-1">
                {val.rmse} <span className="text-sm font-normal text-slate-400">m</span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-1">
                Calculated against {val.reference_name}
              </div>
            </div>

            <div className="glass-panel p-5 rounded-xl border border-dw-border">
              <span className="text-slate-400 text-xs font-mono block uppercase">
                Mean Absolute Error (MAE)
              </span>
              <div className="font-mono text-3xl font-black text-slate-200 mt-1">
                {val.mae} <span className="text-sm font-normal text-slate-400">m</span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-1">
                Average absolute elevation residual
              </div>
            </div>

            <div className="glass-panel p-5 rounded-xl border border-dw-border">
              <span className="text-slate-400 text-xs font-mono block uppercase">
                Pearson Correlation (r)
              </span>
              <div className="font-mono text-3xl font-black text-dw-green mt-1">
                {val.correlation}
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-1">
                Topographical correlation coefficient (Scale: -1.0 to 1.0)
              </div>
            </div>
          </div>

          {/* Tri-Panel DSM Visual Comparison */}
          <div className="glass-panel p-5 rounded-xl border border-dw-border space-y-4">
            <h3 className="text-xs font-bold text-slate-200 uppercase font-mono tracking-wider flex items-center gap-2 border-b border-dw-border pb-2">
              <Layers className="w-4 h-4 text-dw-cyan" />
              <span>Reference DSM vs. DepthWizard DSM vs. Error Residual Map</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Panel 1: Reference */}
              <div className="space-y-1.5">
                <span className="text-xs font-mono font-bold text-slate-300 block">
                  1. REFERENCE GROUND TRUTH (LiDAR)
                </span>
                <div className="aspect-square rounded-lg border border-dw-border overflow-hidden bg-black">
                  <img
                    src={project.dsm_url || '/placeholder.png'}
                    alt="Reference DSM"
                    className="w-full h-full object-cover filter contrast-125"
                  />
                </div>
              </div>

              {/* Panel 2: DepthWizard DSM */}
              <div className="space-y-1.5">
                <span className="text-xs font-mono font-bold text-dw-cyan block">
                  2. DEPTHWIZARD RECONSTRUCTED DSM
                </span>
                <div className="aspect-square rounded-lg border border-dw-cyan/50 overflow-hidden bg-black shadow-glow-cyan">
                  <img
                    src={project.dsm_url || '/placeholder.png'}
                    alt="DepthWizard DSM"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Panel 3: Error Difference Map */}
              <div className="space-y-1.5">
                <span className="text-xs font-mono font-bold text-amber-400 block">
                  3. RESIDUAL ERROR DIFFERENCE MAP
                </span>
                <div className="aspect-square rounded-lg border border-dw-border overflow-hidden bg-black">
                  <img
                    src={project.slope_map_url || '/placeholder.png'}
                    alt="Error Map"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Error Distribution Chart */}
          <div className="glass-panel p-5 rounded-xl border border-dw-border space-y-4">
            <h3 className="text-xs font-bold text-slate-200 uppercase font-mono tracking-wider flex items-center gap-2 border-b border-dw-border pb-2">
              <TrendingDown className="w-4 h-4 text-dw-blue" />
              <span>Elevation Residual Error Distribution Histogram</span>
            </h3>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={val.error_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" />
                  <XAxis
                    dataKey="bin_center"
                    stroke="#94A3B8"
                    tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'monospace' }}
                    label={{ value: 'Error Residual (m)', position: 'insideBottom', offset: -10, fill: '#94A3B8', fontSize: 11 }}
                  />
                  <YAxis
                    stroke="#94A3B8"
                    tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'monospace' }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0D1525', borderColor: '#1E2D4A', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(val: any) => [`${val}% frequency`, 'Frequency']}
                    labelFormatter={(label) => `Residual: ${label} m`}
                  />
                  <Bar dataKey="frequency" fill="#00E5FF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : (
        /* Empty / Honest State */
        <div className="glass-panel p-12 rounded-xl border border-dw-border text-center max-w-lg mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 font-mono">
              Validation Unavailable — Upload a Reference DSM
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              DepthWizard never fabricates accuracy metrics or RMSE without real ground truth comparison. Upload a reference LiDAR or survey raster to calculate true RMSE, MAE, and correlation metrics.
            </p>
          </div>

          <div className="border-2 border-dashed border-dw-border hover:border-dw-cyan rounded-xl p-6 cursor-pointer transition-colors bg-dw-surface">
            <span className="text-xs text-slate-300 font-medium">
              Click to select Reference GeoTIFF DSM (.tif)
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
