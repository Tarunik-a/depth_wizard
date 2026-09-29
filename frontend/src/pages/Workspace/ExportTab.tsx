import React, { useState } from 'react';
import { Project } from '../../types';
import { api } from '../../api/client';
import {
  Download,
  FileCode,
  FileSpreadsheet,
  FileText,
  Layers,
  Box,
  Eye,
  CheckCircle2
} from 'lucide-react';

interface ExportTabProps {
  project: Project;
  onOpenReportPreview: () => void;
}

export const ExportTab: React.FC<ExportTabProps> = ({
  project,
  onOpenReportPreview,
}) => {
  const exportCards = [
    {
      id: 'obj',
      title: '3D Terrain Mesh',
      format: 'Wavefront .OBJ',
      desc: 'Triangulated 3D surface mesh with vertex positions and UV coordinates for Blender, Unreal, and GIS tools.',
      url: api.getExportUrl(project.id, 'obj'),
      icon: <Box className="w-6 h-6 text-dw-cyan" />,
      badge: '3D CAD / GIS',
      available: true,
    },
    {
      id: 'dsm',
      title: 'Digital Surface Model (DSM)',
      format: 'GeoTIFF / PNG Raster',
      desc: '2D elevation raster heatmap containing continuous height surface data.',
      url: api.getExportUrl(project.id, 'dsm'),
      icon: <Layers className="w-6 h-6 text-dw-blue" />,
      badge: 'Raster Elevation',
      available: true,
    },
    {
      id: 'depth',
      title: 'AI Depth Map',
      format: '8-bit PNG Disparity',
      desc: 'Normalized monocular relative depth map output from Depth Anything V2.',
      url: api.getExportUrl(project.id, 'depth'),
      icon: <Eye className="w-6 h-6 text-dw-accent" />,
      badge: 'Computer Vision',
      available: true,
    },
    {
      id: 'csv',
      title: 'Spatial Measurements Log',
      format: 'Structured CSV',
      desc: 'Tabular log of recorded distances, vertical building heights, slopes, and parcel areas.',
      url: api.getExportUrl(project.id, 'csv'),
      icon: <FileSpreadsheet className="w-6 h-6 text-dw-green" />,
      badge: 'Survey Table',
      available: project.measurements.length > 0,
      disabledReason: 'No measurements recorded yet',
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-100 font-mono">
          EXPORT & REPORTING CENTER
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Download reconstructed 3D meshes, elevation matrices, survey logs, and automated scientific reports
        </p>
      </div>

      {/* Featured Card: Generate Analysis Report */}
      <div className="glass-panel-glow p-6 rounded-2xl border border-dw-cyan/50 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-glow-cyan">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-dw-cyan/10 border border-dw-cyan/40 text-dw-cyan">
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-100 font-mono">
                GENERATE ANALYSIS REPORT
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-dw-cyan/20 text-dw-cyan uppercase">
                Ready to Export
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Comprehensive report containing executive summaries, image specifications, elevation range, slope distribution, calibration quality, and validation metrics.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenReportPreview}
            className="px-4 py-2.5 rounded-lg text-xs font-bold bg-gradient-to-r from-dw-cyan to-dw-blue text-dw-bg hover:opacity-90 shadow-glow-cyan transition-all flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            <span>Preview & Print Report</span>
          </button>
        </div>
      </div>

      {/* Export Asset Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {exportCards.map((card) => (
          <div
            key={card.id}
            className="glass-panel p-5 rounded-xl border border-dw-border flex flex-col justify-between hover:border-dw-cyan/40 transition-colors"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-lg bg-dw-surface border border-dw-border">
                  {card.icon}
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-dw-panel text-slate-400 border border-dw-border uppercase">
                  {card.badge}
                </span>
              </div>

              <h4 className="text-sm font-bold text-slate-200 font-mono">{card.title}</h4>
              <span className="text-[11px] font-mono text-dw-cyan block mb-2">{card.format}</span>
              <p className="text-xs text-slate-400 leading-relaxed">{card.desc}</p>
            </div>

            <div className="mt-4 pt-3 border-t border-dw-border/60 flex items-center justify-between">
              {card.available ? (
                <a
                  href={card.url}
                  download
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-dw-surface hover:bg-dw-panel border border-dw-border text-dw-cyan transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Asset</span>
                </a>
              ) : (
                <span className="text-[11px] font-mono text-slate-500 italic">
                  {card.disabledReason}
                </span>
              )}

              <span className="text-[10px] font-mono text-slate-500">Local Cache ✓</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
