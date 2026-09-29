import React, { useEffect, useState } from 'react';
import { Project } from '../types';
import { api } from '../api/client';
import {
  FolderOpen,
  Plus,
  Trash2,
  ExternalLink,
  Layers,
  Calendar,
  CheckCircle,
  Database,
  Sliders,
  Download,
  Compass,
  Home
} from 'lucide-react';

interface ProjectsPageProps {
  onSelectProject: (projectId: string) => void;
  onNewProject: () => void;
  onClose: () => void;
  onGoHome?: () => void;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({
  onSelectProject,
  onNewProject,
  onClose,
  onGoHome,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const list = await api.getProjects();
      setProjects(list);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await api.deleteProject(id);
      loadProjects();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-dw-bg text-slate-100 p-8 flex flex-col items-center gis-grid-bg select-none">
      <div className="w-full max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-dw-border pb-4">
          <div className="flex items-center gap-4">
            <div
              onClick={onGoHome || onClose}
              className="flex items-center gap-2.5 cursor-pointer group pr-4 border-r border-dw-border/70"
              title="Back to Home"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-dw-cyan to-dw-blue flex items-center justify-center shadow-glow-cyan group-hover:scale-105 transition-transform">
                <Compass className="w-5 h-5 text-dw-bg group-hover:rotate-45 transition-transform" />
              </div>
              <div className="flex flex-col">
                <span className="font-mono font-black text-sm tracking-wider text-slate-100 flex items-center gap-1 group-hover:text-dw-cyan transition-colors">
                  DEPTH<span className="text-dw-cyan">WIZARD</span>
                </span>
                <span className="text-[9px] font-mono text-slate-400 -mt-1 tracking-tight">
                  AI-Powered 3D Reconstruction
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-dw-cyan/10 border border-dw-cyan/40 text-dw-cyan">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold font-mono text-slate-100">
                  PROJECT HISTORY & DATASETS
                </h2>
                <p className="text-xs text-slate-400">
                  Manage saved terrain reconstructions and analytical workspaces
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onGoHome || onClose}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold text-slate-400 hover:text-dw-cyan border border-dw-border bg-dw-surface hover:bg-dw-surface/80 transition-colors"
              title="Return to Home Landing Page"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </button>
            <button
              onClick={onNewProject}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-mono bg-gradient-to-r from-dw-cyan to-dw-blue text-dw-bg hover:opacity-90 shadow-glow-cyan transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New Analysis</span>
            </button>
          </div>
        </div>

        {/* Projects Cards Grid */}
        {isLoading ? (
          <div className="py-20 text-center font-mono text-xs text-slate-500">
            Loading saved projects...
          </div>
        ) : projects.length === 0 ? (
          <div className="py-20 text-center glass-panel rounded-2xl border border-dw-border p-8">
            <p className="text-sm font-mono text-slate-400">No projects found.</p>
            <button
              onClick={onNewProject}
              className="mt-4 px-4 py-2 rounded-lg text-xs font-bold bg-dw-cyan text-dw-bg"
            >
              Start Your First Reconstruction
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {projects.map((p) => {
              const isMetric = p.reconstruction_mode === 'metric';
              return (
                <div
                  key={p.id}
                  onClick={() => onSelectProject(p.id)}
                  className="glass-panel p-5 rounded-2xl border border-dw-border hover:border-dw-cyan/50 cursor-pointer transition-all flex flex-col justify-between group shadow-lg"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                          isMetric
                            ? 'bg-dw-green/10 text-dw-green border-dw-green/30'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {isMetric ? '● Metric DSM' : '○ Relative DSM'}
                      </span>

                      {p.is_demo && (
                        <span className="text-[10px] font-mono text-dw-cyan font-bold bg-dw-cyan/15 px-1.5 py-0.5 rounded border border-dw-cyan/30">
                          DEMO
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-bold font-mono text-slate-100 group-hover:text-dw-cyan transition-colors">
                        {p.name}
                      </h3>
                      <div className="text-[11px] font-mono text-slate-400 mt-1 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>{p.created_at.slice(0, 10)}</span>
                        <span>•</span>
                        <span>{p.image_metadata?.format || 'Optical'}</span>
                      </div>
                    </div>

                    {/* Preview Thumbnail */}
                    <div className="aspect-video rounded-lg border border-dw-border overflow-hidden bg-black relative">
                      <img
                        src={p.image_url || '/placeholder.png'}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-4 pt-3 border-t border-dw-border/60 flex items-center justify-between text-xs">
                    <span className="text-dw-cyan flex items-center gap-1 font-mono font-semibold">
                      <span>Open</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </span>

                    {!p.is_demo && (
                      <button
                        onClick={(e) => handleDelete(p.id, e)}
                        className="text-slate-500 hover:text-dw-red transition-colors p-1"
                        title="Delete Project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
