import React from 'react';
import { Project } from '../types';
import {
  Compass,
  Home,
  FolderOpen,
  Presentation,
  Sliders,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  Settings
} from 'lucide-react';

interface NavbarProps {
  project?: Project | null;
  isPresentationMode: boolean;
  onTogglePresentationMode: () => void;
  isAdvancedMode: boolean;
  onToggleAdvancedMode: () => void;
  onOpenProjects: () => void;
  onNewReconstruction: () => void;
  onGoHome: () => void;
  onOpenSettings?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  project,
  isPresentationMode,
  onTogglePresentationMode,
  isAdvancedMode,
  onToggleAdvancedMode,
  onOpenProjects,
  onNewReconstruction,
  onGoHome,
  onOpenSettings,
}) => {
  return (
    <header className="h-14 border-b border-dw-border bg-dw-surface/90 backdrop-blur-md px-4 flex items-center justify-between z-30 select-none">
      {/* Brand & Project Identity */}
      <div className="flex items-center gap-4">
        {/* Clickable Brand Logo -> Navigates to / */}
        <div
          onClick={onGoHome}
          className="flex items-center gap-2.5 cursor-pointer group"
          title="Back to Home"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-dw-cyan to-dw-blue flex items-center justify-center shadow-glow-cyan group-hover:shadow-glow-cyan transition-shadow">
            <Compass className="w-5 h-5 text-dw-bg group-hover:rotate-45 transition-transform duration-300" />
          </div>
          <div className="flex flex-col">
            <span className="font-mono font-black text-sm tracking-wider text-slate-100 flex items-center gap-1 group-hover:text-dw-cyan transition-colors">
              DEPTH<span className="text-dw-cyan">WIZARD</span>
            </span>
            <span className="text-[9px] font-mono text-slate-400 -mt-1 tracking-tight">
              AI-Powered Single-View 3D Reconstruction
            </span>
          </div>
        </div>

        {/* Global Nav Links: Home & Projects */}
        <div className="hidden md:flex items-center gap-1 ml-2 border-l border-dw-border/80 pl-3">
          <button
            onClick={onGoHome}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-slate-300 hover:text-dw-cyan hover:bg-dw-panel transition-colors"
            title="Back to Home"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>
          <button
            onClick={onOpenProjects}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-slate-300 hover:text-dw-cyan hover:bg-dw-panel transition-colors"
            title="View Projects"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Projects</span>
          </button>
        </div>

        {/* Active Project Info */}
        {project && (
          <>
            <div className="w-[1px] h-6 bg-dw-border hidden lg:block" />
            <div className="hidden lg:flex items-center gap-2">
              <span className="font-medium text-xs text-slate-200 truncate max-w-[160px] xl:max-w-xs">
                {project.name}
              </span>

              {/* Reconstruction Mode Badge */}
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wide uppercase border ${
                  project.reconstruction_mode === 'metric'
                    ? 'bg-dw-green/10 text-dw-green border-dw-green/40'
                    : 'bg-dw-amber/10 text-dw-amber border-dw-amber/40'
                }`}
                title={
                  project.reconstruction_mode === 'metric'
                    ? 'Precision 3D: Calibrated Metric Elevation'
                    : 'Quick 3D: Relative Surface Elevation'
                }
              >
                {project.reconstruction_mode === 'metric' ? '● METRIC' : '○ RELATIVE'}
              </span>

              {/* Status Badge */}
              <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                {project.status === 'ready' ? (
                  <span className="flex items-center gap-1 text-dw-green">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>READY</span>
                  </span>
                ) : project.status === 'processing' ? (
                  <span className="flex items-center gap-1 text-dw-cyan animate-pulse">
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    <span>PROCESSING</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-slate-400">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{project.status.toUpperCase()}</span>
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Basic / Advanced Mode Toggle */}
        <button
          onClick={onToggleAdvancedMode}
          className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            isAdvancedMode
              ? 'bg-dw-blue/20 text-dw-cyan border-dw-cyan/50 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 border-dw-border bg-dw-surface'
          }`}
          title="Toggle between Basic (simplified) and Advanced (GIS/Calibration) modes"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{isAdvancedMode ? 'Advanced GIS' : 'Basic Mode'}</span>
        </button>

        {/* Presentation / Jury Mode */}
        <button
          onClick={onTogglePresentationMode}
          className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            isPresentationMode
              ? 'bg-gradient-to-r from-dw-cyan to-dw-blue text-dw-bg border-dw-cyan shadow-glow-cyan'
              : 'text-slate-300 hover:text-dw-cyan border-dw-border bg-dw-surface hover:border-dw-cyan/40'
          }`}
          title="Presentation Mode: maximized 3D view and streamlined demo controls"
        >
          <Presentation className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{isPresentationMode ? 'Exit Full' : 'Focus Mode'}</span>
        </button>

        <div className="w-[1px] h-5 bg-dw-border mx-0.5 sm:mx-1" />

        {/* Projects History Button for small screens */}
        <button
          onClick={onOpenProjects}
          className="md:hidden flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-slate-300 hover:text-dw-cyan hover:bg-dw-panel border border-dw-border transition-colors"
          title="View saved projects"
        >
          <FolderOpen className="w-3.5 h-3.5" />
        </button>

        {/* Settings Button */}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:text-dw-cyan hover:bg-dw-panel border border-dw-border transition-colors"
            title="Platform Settings"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        )}

        {/* New Upload Button */}
        <button
          onClick={onNewReconstruction}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-dw-cyan/20 text-dw-cyan hover:bg-dw-cyan/30 border border-dw-cyan/40 shadow-sm transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Analysis</span>
        </button>
      </div>
    </header>
  );
};
