import React, { useState, useEffect } from 'react';
import { Project, SelectedPointInfo, ToolMode, ExplainTerrainResponse } from '../../types';
import { OverviewTab } from './OverviewTab';
import { AnalysisTab } from './AnalysisTab';
import { ElevationTab } from './ElevationTab';
import { World3DTab } from './World3DTab';
import { MeasureTab } from './MeasureTab';
import { ValidateTab } from './ValidateTab';
import { ExportTab } from './ExportTab';
import { TerrainInsightsModal } from '../../components/TerrainInsightsModal';
import { ReportPreviewModal } from '../../components/ReportPreviewModal';
import { DemoTourGuide } from '../../components/DemoTourGuide';
import { api } from '../../api/client';
import {
  LayoutDashboard,
  Eye,
  Mountain,
  Globe,
  Ruler,
  CheckCircle,
  Download,
  ChevronLeft,
  ChevronRight,
  Home,
  FolderOpen,
  ArrowLeft,
  Settings
} from 'lucide-react';

interface WorkspaceLayoutProps {
  project: Project;
  onProjectUpdated: (project: Project) => void;
  isPresentationMode: boolean;
  onPointSelect?: (info: SelectedPointInfo) => void;
  initialTab?: string;
  onTabChange?: (tab: string) => void;
  onGoHome: () => void;
  onOpenProjects: () => void;
  onOpenSettings?: () => void;
}

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  project,
  onProjectUpdated,
  isPresentationMode,
  onPointSelect,
  initialTab = '3d',
  onTabChange,
  onGoHome,
  onOpenProjects,
  onOpenSettings,
}) => {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [toolMode, setToolMode] = useState<ToolMode>('navigate');
  const [activeMeasurementPoints, setActiveMeasurementPoints] = useState<{ x: number; y: number; z: number }[]>([]);

  // Keep internal activeTab in sync with external initialTab changes
  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Modals state
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
  const [insightsData, setInsightsData] = useState<ExplainTerrainResponse | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportHtml, setReportHtml] = useState<string | null>(null);

  const navItems = [
    { id: 'overview', label: 'Workspace', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'analysis', label: 'Analysis', icon: <Eye className="w-4 h-4" /> },
    { id: 'elevation', label: 'Elevation', icon: <Mountain className="w-4 h-4" /> },
    { id: '3d', label: '3D World', icon: <Globe className="w-4 h-4" /> },
    { id: 'measure', label: 'Measure', icon: <Ruler className="w-4 h-4" /> },
    { id: 'validate', label: 'Validate', icon: <CheckCircle className="w-4 h-4" /> },
    { id: 'export', label: 'Export', icon: <Download className="w-4 h-4" /> },
  ];

  const handleTabSelect = (tabId: string) => {
    setActiveTab(tabId);
    if (onTabChange) {
      onTabChange(tabId);
    }
  };

  const handleOpenExplainTerrain = async () => {
    setIsInsightsOpen(true);
    if (!insightsData) {
      setIsLoadingInsights(true);
      try {
        const res = await api.explainTerrain(project.id);
        setInsightsData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingInsights(false);
      }
    }
  };

  const handleOpenReportPreview = async () => {
    setIsReportOpen(true);
    if (!reportHtml) {
      try {
        const html = await api.getReport(project.id, 'html');
        setReportHtml(html);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleMeasurementPointAdd = async (pt: { x: number; y: number; z: number }) => {
    const nextPoints = [...activeMeasurementPoints, pt];
    setActiveMeasurementPoints(nextPoints);

    if (toolMode === 'measureDistance' && nextPoints.length === 2) {
      await api.addMeasurement(project.id, {
        type: 'distance',
        start_point: nextPoints[0],
        end_point: nextPoints[1],
      });
      const updated = await api.getProject(project.id);
      onProjectUpdated(updated);
      setActiveMeasurementPoints([]);
    } else if (toolMode === 'measureHeight' && nextPoints.length === 2) {
      await api.addMeasurement(project.id, {
        type: 'height',
        start_point: nextPoints[0],
        end_point: nextPoints[1],
      });
      const updated = await api.getProject(project.id);
      onProjectUpdated(updated);
      setActiveMeasurementPoints([]);
    } else if (toolMode === 'measureSlope' && nextPoints.length === 2) {
      await api.addMeasurement(project.id, {
        type: 'slope',
        start_point: nextPoints[0],
        end_point: nextPoints[1],
      });
      const updated = await api.getProject(project.id);
      onProjectUpdated(updated);
      setActiveMeasurementPoints([]);
    } else if (toolMode === 'measurePoint' && nextPoints.length === 1) {
      await api.addMeasurement(project.id, {
        type: 'point',
        start_point: nextPoints[0],
      });
      const updated = await api.getProject(project.id);
      onProjectUpdated(updated);
      setActiveMeasurementPoints([]);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden relative">
      {/* Left Sidebar */}
      {!isPresentationMode && (
        <aside
          className={`border-r border-dw-border bg-dw-surface/95 transition-all duration-300 flex flex-col justify-between z-20 ${
            isSidebarCollapsed ? 'w-14' : 'w-56'
          }`}
        >
          {/* Top Section */}
          <div className="p-2 space-y-2">
            {/* Global navigation items: Home & Projects */}
            <div className="space-y-1">
              <button
                onClick={onGoHome}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-dw-cyan hover:bg-dw-panel transition-all ${
                  isSidebarCollapsed ? 'justify-center px-0' : ''
                }`}
                title="Home"
              >
                <Home className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && <span>Home</span>}
              </button>

              <button
                onClick={onOpenProjects}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-dw-cyan hover:bg-dw-panel transition-all ${
                  isSidebarCollapsed ? 'justify-center px-0' : ''
                }`}
                title="Projects"
              >
                <FolderOpen className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && <span>Projects</span>}
              </button>
            </div>

            {/* Current Project Divider & Header */}
            <div className="border-t border-dw-border/80 pt-2">
              {!isSidebarCollapsed && (
                <div className="px-3 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
                  Current Project
                </div>
              )}
              <div className="space-y-1">
                {navItems.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabSelect(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-dw-cyan/20 text-dw-cyan border border-dw-cyan/50 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-dw-panel'
                      } ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
                      title={item.label}
                    >
                      <span className="shrink-0">{item.icon}</span>
                      {!isSidebarCollapsed && <span>{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Settings & Collapse Toggle */}
          <div className="p-2 border-t border-dw-border space-y-1">
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-dw-panel transition-all ${
                  isSidebarCollapsed ? 'justify-center px-0' : ''
                }`}
                title="Settings"
              >
                <Settings className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && <span>Settings</span>}
              </button>
            )}

            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-dw-panel transition-colors"
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>
        </aside>
      )}

      {/* Main Workspace Area with Breadcrumbs */}
      <main className="flex-1 h-full overflow-hidden bg-[#070B13] relative flex flex-col">
        {/* Workspace Breadcrumbs & Back to Home Header */}
        {!isPresentationMode && (
          <div className="h-10 border-b border-dw-border/70 bg-dw-surface/70 backdrop-blur-sm px-4 flex items-center justify-between shrink-0 select-none z-10 text-xs">
            {/* Breadcrumb Navigation: Home / Projects / Current Project */}
            <nav className="flex items-center gap-2 font-mono text-xs">
              <button
                onClick={onGoHome}
                className="flex items-center gap-1 text-slate-400 hover:text-dw-cyan transition-colors"
                title="Go to Home"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Home</span>
              </button>
              <span className="text-slate-600">/</span>
              <button
                onClick={onOpenProjects}
                className="text-slate-400 hover:text-dw-cyan transition-colors"
                title="Go to Projects"
              >
                Projects
              </button>
              <span className="text-slate-600">/</span>
              <span className="text-slate-200 font-semibold truncate max-w-[200px]" title={project.name}>
                {project.name}
              </span>
            </nav>

            {/* Subtle Back to Home Button */}
            <button
              onClick={onGoHome}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono text-slate-400 hover:text-dw-cyan hover:bg-dw-surface transition-all border border-transparent hover:border-dw-border"
              title="Return to Home Landing Page"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </button>
          </div>
        )}

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto relative">
          {activeTab === '3d' && (
            <World3DTab
              project={project}
              onPointSelect={onPointSelect}
              toolMode={toolMode}
              onMeasurementPointAdd={handleMeasurementPointAdd}
              activeMeasurementPoints={activeMeasurementPoints}
              isPresentationMode={isPresentationMode}
            />
          )}

          {activeTab === 'overview' && (
            <OverviewTab
              project={project}
              onNavigateToTab={handleTabSelect}
              onOpenExplainTerrain={handleOpenExplainTerrain}
            />
          )}

          {activeTab === 'analysis' && (
            <AnalysisTab
              project={project}
              onProjectUpdated={onProjectUpdated}
              onNavigateToTab={handleTabSelect}
            />
          )}

          {activeTab === 'elevation' && (
            <ElevationTab
              project={project}
              onProjectUpdated={onProjectUpdated}
              onNavigateToTab={handleTabSelect}
            />
          )}

          {activeTab === 'measure' && (
            <MeasureTab
              project={project}
              onProjectUpdated={onProjectUpdated}
              onSetToolMode={(mode) => {
                setToolMode(mode);
                handleTabSelect('3d');
              }}
              activeToolMode={toolMode}
            />
          )}

          {activeTab === 'validate' && <ValidateTab project={project} />}

          {activeTab === 'export' && (
            <ExportTab
              project={project}
              onOpenReportPreview={handleOpenReportPreview}
            />
          )}

          {/* Presentation / Focus Mode Floating Tab Bar */}
          {isPresentationMode && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 glass-panel p-1 rounded-xl border border-dw-cyan/50 shadow-2xl flex items-center gap-1 backdrop-blur-xl animate-fade-in select-none">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabSelect(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-dw-cyan text-dw-bg shadow-glow-cyan'
                        : 'text-slate-300 hover:text-white hover:bg-dw-surface'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Product Tour Guide Widget */}
      <DemoTourGuide
        currentTab={activeTab}
        onNavigateToTab={handleTabSelect}
        isMetric={project.reconstruction_mode === 'metric'}
      />

      {/* Terrain Insights Modal */}
      <TerrainInsightsModal
        isOpen={isInsightsOpen}
        onClose={() => setIsInsightsOpen(false)}
        insights={insightsData}
        isLoading={isLoadingInsights}
      />

      {/* Report Preview Modal */}
      <ReportPreviewModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        project={project}
        reportHtml={reportHtml}
      />
    </div>
  );
};
