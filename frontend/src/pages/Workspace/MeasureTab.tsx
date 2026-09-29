import React, { useState } from 'react';
import { Project, Measurement, ToolMode } from '../../types';
import { api } from '../../api/client';
import {
  Ruler,
  Maximize,
  Activity,
  MapPin,
  Box,
  Trash2,
  Download,
  AlertTriangle,
  Info
} from 'lucide-react';

interface MeasureTabProps {
  project: Project;
  onProjectUpdated: (project: Project) => void;
  onSetToolMode: (mode: ToolMode) => void;
  activeToolMode: ToolMode;
}

export const MeasureTab: React.FC<MeasureTabProps> = ({
  project,
  onProjectUpdated,
  onSetToolMode,
  activeToolMode,
}) => {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const tools: { id: ToolMode; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'measureDistance',
      label: 'Distance (Point-to-Point)',
      icon: <Ruler className="w-4 h-4" />,
      desc: 'Click two points on the 3D surface to calculate linear span.',
    },
    {
      id: 'measureHeight',
      label: 'Vertical Height',
      icon: <Maximize className="w-4 h-4" />,
      desc: 'Select base point and rooftop/peak to measure vertical relief.',
    },
    {
      id: 'measureSlope',
      label: 'Surface Gradient',
      icon: <Activity className="w-4 h-4" />,
      desc: 'Calculate slope inclination angle in degrees between two locations.',
    },
    {
      id: 'measurePoint',
      label: 'Spot Elevation',
      icon: <MapPin className="w-4 h-4" />,
      desc: 'Query exact elevation and spatial coordinates at any single point.',
    },
    {
      id: 'measureArea',
      label: 'Footprint Area',
      icon: <Box className="w-4 h-4" />,
      desc: 'Estimate planar polygon surface area for building parcels.',
    },
  ];

  const handleDelete = async (measurementId: string) => {
    try {
      setIsDeleting(measurementId);
      await api.deleteMeasurement(project.id, measurementId);
      const updated = await api.getProject(project.id);
      onProjectUpdated(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(null);
    }
  };

  const isMetric = project.terrain_stats?.is_metric ?? false;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 font-mono">
            3D SPATIAL MEASUREMENT TOOLS
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Derive distances, building vertical heights, slope angles, and surface areas
          </p>
        </div>

        {/* Export CSV Button */}
        {project.measurements.length > 0 && (
          <a
            href={api.getExportUrl(project.id, 'csv')}
            download
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-dw-surface hover:bg-dw-panel border border-dw-border text-dw-cyan transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>
        )}
      </div>

      {/* Honesty Banner if Relative Mode */}
      {!isMetric && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong>Relative Scale Notice: </strong>
            Metric scale unavailable without geospatial tie-points. Measurements are displayed in relative reconstruction units. Calibrate with GCPs in the Elevation tab for absolute meter dimensions.
          </div>
        </div>
      )}

      {/* Tool Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {tools.map((t) => {
          const isActive = activeToolMode === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onSetToolMode(isActive ? 'navigate' : t.id)}
              className={`p-3.5 rounded-xl text-left border transition-all flex flex-col justify-between ${
                isActive
                  ? 'bg-dw-cyan/20 border-dw-cyan text-dw-cyan shadow-glow-cyan'
                  : 'bg-dw-surface/70 border-dw-border text-slate-300 hover:border-dw-cyan/50 hover:bg-dw-panel'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="p-1.5 rounded-lg bg-dw-surface border border-dw-border/80">
                  {t.icon}
                </span>
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                    isActive ? 'bg-dw-cyan text-dw-bg' : 'bg-dw-panel text-slate-500'
                  }`}
                >
                  {isActive ? 'Active' : 'Select'}
                </span>
              </div>
              <div>
                <div className="font-semibold text-xs text-slate-200">{t.label}</div>
                <div className="text-[10px] text-slate-400 mt-1 leading-tight">{t.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Recorded Measurements Table */}
      <div className="glass-panel p-5 rounded-xl border border-dw-border space-y-4">
        <div className="flex items-center justify-between border-b border-dw-border pb-3">
          <h3 className="text-xs font-bold text-slate-200 uppercase font-mono tracking-wider">
            Recorded Surface Measurements ({project.measurements.length})
          </h3>
          <span className="text-[11px] font-mono text-slate-400">
            Source: Derived from reconstructed 3D surface mesh
          </span>
        </div>

        {project.measurements.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 font-mono">
            No measurements logged yet. Select a measurement tool above, then navigate to the 3D World tab to place points directly on the terrain surface.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-dw-border text-slate-400 font-mono text-[11px]">
                  <th className="pb-2">ID</th>
                  <th className="pb-2">Tool Type</th>
                  <th className="pb-2">Calculated Value</th>
                  <th className="pb-2">Reference Scale</th>
                  <th className="pb-2">Metadata / Details</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dw-border/50 font-mono">
                {project.measurements.map((m) => (
                  <tr key={m.id} className="text-slate-300">
                    <td className="py-2.5 text-dw-cyan font-bold">{m.id}</td>
                    <td className="py-2.5 capitalize">{m.type}</td>
                    <td className="py-2.5 font-bold text-slate-100 text-sm">
                      {m.value} <span className="text-xs text-dw-cyan">{m.unit}</span>
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          m.is_metric
                            ? 'bg-dw-green/10 text-dw-green border border-dw-green/30'
                            : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {m.is_metric ? 'Metric (m)' : 'Relative'}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-400 text-[11px]">
                      {m.details?.description ||
                        (m.details?.base_elevation
                          ? `Base: ${m.details.base_elevation}m, Top: ${m.details.top_elevation}m`
                          : 'Point surface tie')}
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => handleDelete(m.id)}
                        disabled={isDeleting === m.id}
                        className="text-slate-500 hover:text-dw-red transition-colors p-1"
                        title="Delete measurement"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
