import React, { useState, useEffect, useRef } from 'react';
import { Project, SelectedPointInfo } from './types';
import { api } from './api/client';
import { Navbar } from './components/Navbar';
import { StatusBar } from './components/StatusBar';
import { LandingPage } from './pages/LandingPage';
import { UploadPage } from './pages/UploadPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { WorkspaceLayout } from './pages/Workspace/WorkspaceLayout';
import { SettingsModal } from './components/SettingsModal';

type AppView = 'landing' | 'upload' | 'workspace' | 'projects';

interface ParsedRoute {
  view: AppView;
  projectId?: string;
  tab?: string;
}

const parseRoute = (path: string): ParsedRoute => {
  const trimmed = path.trim().replace(/\/+$/, '') || '/';

  if (trimmed === '/' || trimmed === '') {
    return { view: 'landing' };
  }
  if (trimmed === '/upload') {
    return { view: 'upload' };
  }
  if (trimmed === '/projects') {
    return { view: 'projects' };
  }
  if (trimmed.startsWith('/projects/')) {
    const parts = trimmed.split('/');
    const id = parts[2];
    return { view: 'workspace', projectId: id, tab: '3d' };
  }
  if (trimmed.startsWith('/workspace/')) {
    const parts = trimmed.split('/');
    const id = parts[2];
    const tab = parts[3] || '3d';
    return { view: 'workspace', projectId: id, tab };
  }
  return { view: 'landing' };
};

export const App: React.FC = () => {
  // Current route pathname synchronized with HTML5 History
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname || '/');

  // In-memory project cache so navigating away never loses state
  const projectsCache = useRef<Record<string, Project>>({});

  // Current active project
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [preloadDemo, setPreloadDemo] = useState(false);
  const [workspaceActiveTab, setWorkspaceActiveTab] = useState('3d');

  // Inspection & cursor data
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; elevation: number } | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<SelectedPointInfo | null>(null);

  // App-wide flags
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [isAdvancedMode, setIsAdvancedMode] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Synchronize route navigation
  const navigateTo = (path: string, replace = false) => {
    if (window.location.pathname !== path) {
      if (replace) {
        window.history.replaceState({}, '', path);
      } else {
        window.history.pushState({}, '', path);
      }
    }
    setCurrentPath(path);
  };

  // Popstate listener for browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync state with current route
  const route = parseRoute(currentPath);

  useEffect(() => {
    if (route.view === 'workspace' && route.projectId) {
      const pid = route.projectId;
      const tab = route.tab || '3d';
      setWorkspaceActiveTab(tab);

      if (currentProject && currentProject.id === pid) {
        // Project already active in state, no refetch required
        return;
      }

      // Check in-memory cache first to guarantee zero state loss
      if (projectsCache.current[pid]) {
        setCurrentProject(projectsCache.current[pid]);
        return;
      }

      // Otherwise fetch from backend API
      api.getProject(pid)
        .then((p) => {
          projectsCache.current[p.id] = p;
          setCurrentProject(p);
        })
        .catch(() => {
          // If demo project requested, initialize it automatically
          if (pid.includes('demo')) {
            api.initializeDemo().then((demo) => {
              projectsCache.current[demo.id] = demo;
              setCurrentProject(demo);
            }).catch(() => {
              navigateTo('/');
            });
          } else {
            navigateTo('/');
          }
        });
    }
  }, [currentPath]);

  // Keep projectsCache updated whenever currentProject changes
  const handleProjectUpdated = (updated: Project) => {
    projectsCache.current[updated.id] = updated;
    setCurrentProject(updated);
  };

  const handleStartReconstruction = () => {
    setPreloadDemo(false);
    navigateTo('/upload');
  };

  const handleTrySampleDataset = () => {
    setPreloadDemo(true);
    navigateTo('/upload');
  };

  const handleInstantDemo = async () => {
    try {
      // Check if demo is in cache
      if (projectsCache.current['demo-urban-terrain']) {
        const cached = projectsCache.current['demo-urban-terrain'];
        setCurrentProject(cached);
        navigateTo(`/workspace/${cached.id}/3d`);
        return;
      }

      const demo = await api.initializeDemo();
      projectsCache.current[demo.id] = demo;
      setCurrentProject(demo);
      navigateTo(`/workspace/${demo.id}/3d`);
    } catch (err) {
      console.error('Instant demo launch failed', err);
    }
  };

  const handleProjectReady = (project: Project, targetTab: string = 'analysis') => {
    projectsCache.current[project.id] = project;
    setCurrentProject(project);
    setWorkspaceActiveTab(targetTab);
    navigateTo(`/workspace/${project.id}/${targetTab}`);
  };

  const handleSelectProject = async (id: string) => {
    if (projectsCache.current[id]) {
      const cached = projectsCache.current[id];
      setCurrentProject(cached);
      navigateTo(`/workspace/${cached.id}/3d`);
      return;
    }

    try {
      const p = await api.getProject(id);
      projectsCache.current[p.id] = p;
      setCurrentProject(p);
      navigateTo(`/workspace/${p.id}/3d`);
    } catch (err) {
      console.error('Failed to load project', err);
    }
  };

  const handleTabChange = (newTab: string) => {
    setWorkspaceActiveTab(newTab);
    if (currentProject) {
      navigateTo(`/workspace/${currentProject.id}/${newTab}`);
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-[#070B13] text-slate-100 overflow-hidden font-sans">
      {route.view === 'landing' ? (
        <LandingPage
          onStartReconstruction={handleStartReconstruction}
          onTrySampleDataset={handleTrySampleDataset}
          onInstantDemo={handleInstantDemo}
          onOpenProjects={() => navigateTo('/projects')}
          onGoHome={() => navigateTo('/')}
        />
      ) : route.view === 'upload' ? (
        <UploadPage
          prefillDemo={preloadDemo}
          onProjectReady={handleProjectReady}
          onCancel={() => (currentProject ? navigateTo(`/workspace/${currentProject.id}/${workspaceActiveTab}`) : navigateTo('/'))}
          onGoHome={() => navigateTo('/')}
        />
      ) : route.view === 'projects' ? (
        <ProjectsPage
          onSelectProject={handleSelectProject}
          onNewProject={() => navigateTo('/upload')}
          onClose={() => (currentProject ? navigateTo(`/workspace/${currentProject.id}/${workspaceActiveTab}`) : navigateTo('/'))}
          onGoHome={() => navigateTo('/')}
        />
      ) : (
        /* Workspace View */
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <Navbar
            project={currentProject}
            isPresentationMode={isPresentationMode}
            onTogglePresentationMode={() => setIsPresentationMode(!isPresentationMode)}
            isAdvancedMode={isAdvancedMode}
            onToggleAdvancedMode={() => setIsAdvancedMode(!isAdvancedMode)}
            onOpenProjects={() => navigateTo('/projects')}
            onNewReconstruction={() => navigateTo('/upload')}
            onGoHome={() => navigateTo('/')}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />

          {currentProject ? (
            <WorkspaceLayout
              project={currentProject}
              onProjectUpdated={handleProjectUpdated}
              isPresentationMode={isPresentationMode}
              onPointSelect={(pt) => setSelectedPoint(pt)}
              initialTab={workspaceActiveTab}
              onTabChange={handleTabChange}
              onGoHome={() => navigateTo('/')}
              onOpenProjects={() => navigateTo('/projects')}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center font-mono text-sm text-slate-400">
              <div className="text-center space-y-3">
                <p>Loading project workspace...</p>
                <button
                  onClick={() => navigateTo('/')}
                  className="px-4 py-2 rounded-lg text-xs bg-dw-cyan text-dw-bg font-bold"
                >
                  Return to Home
                </button>
              </div>
            </div>
          )}

          <StatusBar
            project={currentProject}
            hoveredPoint={hoveredPoint}
            selectedPoint={selectedPoint}
          />
        </div>
      )}

      {/* Global Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

export default App;
