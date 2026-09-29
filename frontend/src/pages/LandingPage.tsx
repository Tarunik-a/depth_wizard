import React from 'react';
import {
  Compass,
  ArrowRight,
  Database,
  Sparkles,
  Layers,
  Mountain,
  Globe,
  Activity,
  FileCheck,
  CheckCircle,
  FileText
} from 'lucide-react';

interface LandingPageProps {
  onStartReconstruction: () => void;
  onTrySampleDataset: () => void;
  onOpenProjects?: () => void;
  onInstantDemo?: () => void;
  onGoHome?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartReconstruction,
  onTrySampleDataset,
  onOpenProjects,
  onInstantDemo,
  onGoHome,
}) => {
  const features = [
    {
      title: 'AI Depth Estimation',
      desc: 'Monocular depth inference using Depth Anything V2 architecture with edge-preserving spatial frequency fallbacks.',
      icon: <Layers className="w-5 h-5 text-dw-cyan" />,
    },
    {
      title: 'Metric Elevation Calibration',
      desc: 'Rigorous affine GCP tie-point calibration (H = a·D + b) and DEM co-registration. Technical honesty: zero metric fabrication.',
      icon: <Mountain className="w-5 h-5 text-dw-blue" />,
    },
    {
      title: 'Interactive 3D Terrain',
      desc: 'Full-viewport WebGL Three.js terrain mesh displaced by the DSM with high-res optical texture projection.',
      icon: <Globe className="w-5 h-5 text-dw-cyan" />,
    },
    {
      title: 'Terrain & Slope Analysis',
      desc: "Horn's gradient algorithm for instant slope angles, aspect classification, and relief hillshade visualization.",
      icon: <Activity className="w-5 h-5 text-dw-green" />,
    },
    {
      title: 'DSM Accuracy Validation',
      desc: 'Validation benchmark against LiDAR ground truth with RMSE, MAE, Pearson correlation, and error distribution charts.',
      icon: <FileCheck className="w-5 h-5 text-amber-400" />,
    },
    {
      title: 'Export & Automated Reporting',
      desc: 'One-click export for 3D Wavefront OBJ models, GeoTIFF DSMs, CSV measurement logs, and executive PDF/HTML reports.',
      icon: <FileText className="w-5 h-5 text-dw-blue" />,
    },
  ];

  const pipeline = [
    { step: 'IMAGE', desc: 'Optical / Satellite' },
    { step: 'AI DEPTH', desc: 'Relative Disparity' },
    { step: 'CALIBRATION', desc: 'DEM / Survey GCP' },
    { step: 'DSM', desc: 'Elevation Matrix' },
    { step: '3D WORLD', desc: 'Displaced Mesh' },
    { step: 'ANALYSIS', desc: 'Slope & Survey' },
  ];

  return (
    <div className="min-h-screen bg-dw-bg text-slate-100 flex flex-col justify-between gis-grid-bg relative select-none">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-dw-cyan/5 blur-[120px] pointer-events-none rounded-full" />

      {/* Header */}
      <header className="px-8 py-5 flex items-center justify-between border-b border-dw-border/60 bg-dw-surface/40 backdrop-blur-md z-10">
        {/* Clickable Brand Logo -> Navigates to / */}
        <div
          onClick={onGoHome || (() => window.scrollTo({ top: 0, behavior: 'smooth' }))}
          className="flex items-center gap-2.5 cursor-pointer group"
          title="Back to Home"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-dw-cyan to-dw-blue flex items-center justify-center shadow-glow-cyan group-hover:scale-105 transition-transform">
            <Compass className="w-5 h-5 text-dw-bg" />
          </div>
          <div className="flex flex-col">
            <span className="font-mono font-black text-base tracking-wider text-slate-100">
              DEPTH<span className="text-dw-cyan">WIZARD</span>
            </span>
            <span className="text-[9px] font-mono text-slate-400 -mt-0.5 tracking-tight">
              AI-Powered Single-View 3D Reconstruction
            </span>
          </div>
        </div>

        {/* Center / Right Navigation */}
        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-1 mr-2">
            <button
              onClick={onGoHome || (() => window.scrollTo({ top: 0, behavior: 'smooth' }))}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-dw-cyan bg-dw-cyan/10 border border-dw-cyan/30 font-mono"
            >
              Home
            </button>
            {onOpenProjects && (
              <button
                onClick={onOpenProjects}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-dw-surface transition-colors font-mono"
              >
                Projects
              </button>
            )}
          </nav>

          <button
            onClick={onTrySampleDataset}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-dw-cyan hover:bg-dw-surface transition-colors font-mono"
          >
            Try Sample Dataset
          </button>
          <button
            onClick={onStartReconstruction}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-dw-cyan to-dw-blue text-dw-bg hover:opacity-90 shadow-glow-cyan transition-all font-mono"
          >
            Start Reconstruction
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center z-10 max-w-5xl mx-auto space-y-10">
        <div className="space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-dw-cyan/10 border border-dw-cyan/30 text-dw-cyan text-xs font-mono">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-POWERED SINGLE-VIEW 3D RECONSTRUCTION</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black font-mono tracking-tight text-slate-100">
            From One Image to an Interactive 3D World
          </h1>

          <p className="text-sm sm:text-base text-slate-400 font-sans leading-relaxed max-w-2xl mx-auto">
            Transform aerial and satellite imagery into intelligent depth, elevation and interactive 3D terrain models.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={onStartReconstruction}
            className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl font-bold font-mono text-sm bg-gradient-to-r from-dw-cyan to-dw-blue text-dw-bg hover:opacity-95 shadow-glow-cyan transition-all group"
          >
            <span>Start Reconstruction</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={onTrySampleDataset}
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold font-mono text-sm bg-dw-surface hover:bg-dw-panel border border-dw-border hover:border-dw-cyan/50 text-slate-200 transition-all"
          >
            <Database className="w-4 h-4 text-dw-cyan" />
            <span>Try Sample Dataset</span>
          </button>
        </div>

        {/* Supported Formats */}
        <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
          <span className="text-slate-500 uppercase">Supported Formats:</span>
          <span className="px-2 py-0.5 rounded bg-dw-surface border border-dw-border text-slate-300">PNG</span>
          <span>•</span>
          <span className="px-2 py-0.5 rounded bg-dw-surface border border-dw-border text-slate-300">JPG</span>
          <span>•</span>
          <span className="px-2 py-0.5 rounded bg-dw-surface border border-dw-border text-slate-300">TIFF</span>
          <span>•</span>
          <span className="px-2 py-0.5 rounded bg-dw-surface border border-dw-cyan/40 text-dw-cyan font-bold">GeoTIFF</span>
        </div>

        {/* Visual Pipeline Stepper */}
        <div className="w-full glass-panel p-6 rounded-2xl border border-dw-border shadow-xl">
          <h3 className="text-xs font-bold text-slate-400 uppercase font-mono tracking-widest mb-4">
            Processing Architecture Pipeline
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            {pipeline.map((item, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div className="w-full p-2.5 rounded-lg bg-dw-surface border border-dw-border/80 flex flex-col items-center gap-1">
                  <span className="font-mono text-xs font-bold text-dw-cyan">{item.step}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{item.desc}</span>
                </div>
                {idx < pipeline.length - 1 && (
                  <span className="hidden sm:block text-slate-600 text-xs mt-1">↓</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left w-full">
          {features.map((f, i) => (
            <div
              key={i}
              className="glass-panel p-5 rounded-xl border border-dw-border hover:border-dw-cyan/40 transition-colors space-y-2"
            >
              <div className="p-2 rounded-lg bg-dw-surface border border-dw-border w-fit">
                {f.icon}
              </div>
              <h4 className="text-sm font-bold text-slate-200 font-mono">{f.title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="px-8 py-4 border-t border-dw-border/60 bg-dw-surface/40 text-center text-xs font-mono text-slate-500 z-10 flex flex-col sm:flex-row items-center justify-between">
        <div>DEPTHWIZARD • AI-Powered Single-View 3D Reconstruction</div>
        <div className="text-[11px] text-slate-400 mt-1 sm:mt-0">
          Relative Surface Mode (Ordinary RGB) & Calibrated Metric Elevation (GeoTIFF / GCP)
        </div>
      </footer>
    </div>
  );
};
