import React, { useState, Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { HeightfieldData, Project, SelectedPointInfo, ViewMode, ToolMode } from '../types';
import { TerrainMesh } from './TerrainMesh';
import { FlythroughController, FlythroughState } from './FlythroughController';
import { MeasurementMarkers } from './MeasurementMarkers';
import { ViewModeControls } from './ViewModeControls';
import { CompassGizmo } from './CompassGizmo';
import { SettingsModal } from '../components/SettingsModal';
import {
  Play,
  Pause,
  RotateCcw,
  X,
  Maximize2,
  Minimize2,
  Footprints,
  Info,
  MapPin,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Compass,
  Settings
} from 'lucide-react';

interface TerrainViewerProps {
  project: Project;
  heightfield: HeightfieldData;
  toolMode?: ToolMode;
  onPointSelect?: (info: SelectedPointInfo) => void;
  onMeasurementPointAdd?: (point: { x: number; y: number; z: number }) => void;
  activeMeasurementPoints?: { x: number; y: number; z: number }[];
  isPresentationMode?: boolean;
}

export const TerrainViewer: React.FC<TerrainViewerProps> = ({
  project,
  heightfield,
  toolMode = 'navigate',
  onPointSelect,
  onMeasurementPointAdd,
  activeMeasurementPoints = [],
  isPresentationMode = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // View settings
  const [viewMode, setViewMode] = useState<ViewMode>('rgb');
  const [wireframe, setWireframe] = useState(false);
  const [verticalExaggeration, setVerticalExaggeration] = useState(1.2);
  const [resetCameraCount, setResetCameraCount] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Flythrough state
  const [flythroughState, setFlythroughState] = useState<FlythroughState>('idle');
  const [isFlythroughPaused, setIsFlythroughPaused] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Point Inspection
  const [selectedPoint, setSelectedPoint] = useState<SelectedPointInfo | null>(null);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handlePointClick = (info: SelectedPointInfo) => {
    setSelectedPoint(info);
    if (onPointSelect) onPointSelect(info);

    // If currently measuring, record point
    if (toolMode.startsWith('measure') && onMeasurementPointAdd) {
      onMeasurementPointAdd({ x: info.x, y: info.y, z: info.elevation });
    }
  };

  // Dispatch synthetic keyboard events for onscreen walk controls
  const sendKey = (code: string, isDown: boolean) => {
    const eventType = isDown ? 'keydown' : 'keyup';
    window.dispatchEvent(new KeyboardEvent(eventType, { code }));
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-[#05080E] overflow-hidden select-none ${
        isFullscreen ? 'fixed inset-0 z-50' : ''
      }`}
    >
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 18, 22], fov: 45 }}
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
        shadows
      >
        <color attach="background" args={['#070B13']} />

        {/* Scientific Directional & Ambient Lighting */}
        <ambientLight intensity={0.75} />
        {/* Sun at Azimuth 315, Altitude 45 */}
        <directionalLight
          position={[-22, 28, -22]}
          intensity={1.6}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        {/* Soft sky and fill lights */}
        <directionalLight position={[20, 15, 20]} intensity={0.4} color="#80D8FF" />
        <directionalLight position={[0, -20, 0]} intensity={0.25} color="#0D47A1" />

        <Suspense fallback={null}>
          <TerrainMesh
            heightfield={heightfield}
            project={project}
            viewMode={viewMode}
            wireframe={wireframe}
            verticalExaggeration={verticalExaggeration}
            onPointClick={handlePointClick}
          />
          <MeasurementMarkers
            measurements={project.measurements}
            activePoints={activeMeasurementPoints}
          />
        </Suspense>

        <FlythroughController
          state={flythroughState}
          isPaused={isFlythroughPaused}
          onExit={() => setFlythroughState('idle')}
          resetCameraTrigger={resetCameraCount}
        />
      </Canvas>

      {/* Top-Left Product Watermark / Badge */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 glass-panel px-3 py-1.5 rounded-lg border border-dw-border/80 shadow-lg select-none">
        <div className="w-5 h-5 rounded bg-gradient-to-br from-dw-cyan to-dw-blue flex items-center justify-center">
          <Compass className="w-3.5 h-3.5 text-dw-bg" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-mono font-bold text-slate-100 tracking-wider">
            DEPTH<span className="text-dw-cyan">WIZARD</span> 3D
          </span>
          <span className="text-[9px] font-mono text-slate-400">
            {heightfield.is_metric ? 'Calibrated Metric Terrain' : 'Relative Surface Mesh'}
          </span>
        </div>
      </div>

      {/* Floating View Mode Controls */}
      <ViewModeControls
        currentMode={viewMode}
        onModeChange={setViewMode}
        wireframe={wireframe}
        onToggleWireframe={() => setWireframe(!wireframe)}
        verticalExaggeration={verticalExaggeration}
        onExaggerationChange={setVerticalExaggeration}
        minElevation={heightfield.min_elevation}
        maxElevation={heightfield.max_elevation}
        elevationUnit={heightfield.is_metric ? 'm' : 'rel units'}
      />

      {/* Top-Right Action Controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {/* Flythrough Button / Toolbar */}
        {flythroughState === 'idle' ? (
          <div className="glass-panel p-1 rounded-lg flex items-center shadow-lg border border-dw-border">
            <button
              onClick={() => setFlythroughState('cinematic')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold bg-gradient-to-r from-dw-cyan to-dw-blue text-dw-bg hover:opacity-90 shadow-glow-cyan transition-all font-mono"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>START FLYTHROUGH</span>
            </button>
            <div className="w-[1px] h-4 bg-dw-border mx-1" />
            <button
              onClick={() => setFlythroughState('orbit')}
              className="px-2 py-1.5 rounded-md text-xs text-slate-300 hover:text-dw-cyan hover:bg-dw-surface transition-colors font-mono"
              title="Continuous 360 circular orbit"
            >
              Orbit
            </button>
            <button
              onClick={() => setFlythroughState('firstPerson')}
              className="px-2 py-1.5 rounded-md text-xs text-slate-300 hover:text-dw-cyan hover:bg-dw-surface transition-colors flex items-center gap-1 font-mono"
              title="WASD first-person surface walk"
            >
              <Footprints className="w-3.5 h-3.5" />
              <span>Walk</span>
            </button>
          </div>
        ) : (
          <div className="glass-panel p-1.5 rounded-lg flex items-center gap-1.5 shadow-xl border border-dw-cyan/60 animate-pulse-cyan">
            <span className="text-xs font-mono font-bold text-dw-cyan uppercase px-2">
              {flythroughState} Mode
            </span>
            <button
              onClick={() => setIsFlythroughPaused(!isFlythroughPaused)}
              className="p-1.5 rounded bg-dw-surface hover:bg-dw-panel text-slate-200"
              title={isFlythroughPaused ? 'Resume' : 'Pause'}
            >
              {isFlythroughPaused ? <Play className="w-4 h-4 fill-current text-dw-green" /> : <Pause className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                setResetCameraCount((c) => c + 1);
                setIsFlythroughPaused(false);
              }}
              className="p-1.5 rounded bg-dw-surface hover:bg-dw-panel text-slate-200"
              title="Restart Flythrough"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setFlythroughState('idle');
                setIsFlythroughPaused(false);
              }}
              className="p-1.5 rounded bg-dw-red/20 text-dw-red hover:bg-dw-red/30"
              title="Exit Flythrough"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Camera Reset */}
        <button
          onClick={() => setResetCameraCount((c) => c + 1)}
          className="glass-panel p-2 rounded-lg text-slate-300 hover:text-dw-cyan hover:border-dw-cyan transition-all border border-dw-border shadow-lg"
          title="Reset View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="glass-panel p-2 rounded-lg text-slate-300 hover:text-dw-cyan hover:border-dw-cyan transition-all border border-dw-border shadow-lg"
          title="Fullscreen"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Viewport Settings */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="glass-panel p-2 rounded-lg text-slate-300 hover:text-dw-cyan hover:border-dw-cyan transition-all border border-dw-border shadow-lg"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* First-person WASD Helper Badge & On-Screen D-Pad */}
      {flythroughState === 'firstPerson' && (
        <div className="absolute top-16 right-4 z-20 flex flex-col gap-2">
          {/* Key shortcut helper */}
          <div className="glass-panel px-3 py-2 rounded-md border border-dw-border text-[11px] font-mono text-slate-300 flex flex-col gap-1">
            <div><strong className="text-dw-cyan">W / S:</strong> Forward / Back</div>
            <div><strong className="text-dw-cyan">A / D:</strong> Strafe Left / Right</div>
            <div><strong className="text-dw-cyan">Space / C:</strong> Ascend / Descend</div>
            <div><strong className="text-dw-cyan">Shift:</strong> Speed Boost</div>
          </div>

          {/* On-screen navigation controller buttons */}
          <div className="glass-panel p-2 rounded-lg border border-dw-border flex flex-col items-center gap-1 select-none">
            <button
              onMouseDown={() => sendKey('KeyW', true)}
              onMouseUp={() => sendKey('KeyW', false)}
              className="p-1.5 rounded bg-dw-surface hover:bg-dw-panel text-slate-200 border border-dw-border"
              title="Move Forward (W)"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <div className="flex gap-1">
              <button
                onMouseDown={() => sendKey('KeyA', true)}
                onMouseUp={() => sendKey('KeyA', false)}
                className="p-1.5 rounded bg-dw-surface hover:bg-dw-panel text-slate-200 border border-dw-border"
                title="Strafe Left (A)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onMouseDown={() => sendKey('KeyS', true)}
                onMouseUp={() => sendKey('KeyS', false)}
                className="p-1.5 rounded bg-dw-surface hover:bg-dw-panel text-slate-200 border border-dw-border"
                title="Move Backward (S)"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <button
                onMouseDown={() => sendKey('KeyD', true)}
                onMouseUp={() => sendKey('KeyD', false)}
                className="p-1.5 rounded bg-dw-surface hover:bg-dw-panel text-slate-200 border border-dw-border"
                title="Strafe Right (D)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-1 mt-1">
              <button
                onMouseDown={() => sendKey('Space', true)}
                onMouseUp={() => sendKey('Space', false)}
                className="px-2 py-1 rounded bg-dw-surface hover:bg-dw-panel text-dw-cyan text-[10px] font-mono border border-dw-border flex items-center gap-0.5"
                title="Ascend (Space)"
              >
                <ArrowUp className="w-3 h-3" />
                <span>Up</span>
              </button>
              <button
                onMouseDown={() => sendKey('KeyC', true)}
                onMouseUp={() => sendKey('KeyC', false)}
                className="px-2 py-1 rounded bg-dw-surface hover:bg-dw-panel text-dw-cyan text-[10px] font-mono border border-dw-border flex items-center gap-0.5"
                title="Descend (C)"
              >
                <ArrowDown className="w-3 h-3" />
                <span>Down</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compass Orientation Gizmo */}
      <div className="absolute bottom-20 left-4 z-20">
        <CompassGizmo onResetNorth={() => setResetCameraCount((c) => c + 1)} />
      </div>

      {/* Selected Point Information Overlay */}
      {selectedPoint && (
        <div className="absolute bottom-6 right-4 z-20 glass-panel p-3.5 rounded-lg border border-dw-border shadow-2xl min-w-[280px]">
          <div className="flex items-center justify-between border-b border-dw-border pb-1.5 mb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-dw-cyan">
              <MapPin className="w-3.5 h-3.5" />
              <span>SELECTED POINT</span>
            </div>
            <button
              onClick={() => setSelectedPoint(null)}
              className="text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Elevation:</span>
              <span className="font-mono font-bold text-dw-cyan text-sm">
                {selectedPoint.elevation}{' '}
                <span className="text-[10px] font-normal text-slate-300">
                  {selectedPoint.isMetric ? 'm' : 'rel units'}
                </span>
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Relative Depth:</span>
              <span className="font-mono text-slate-200 text-sm">{selectedPoint.relativeDepth}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Slope:</span>
              <span className="font-mono text-slate-200">{selectedPoint.slope}°</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Aspect:</span>
              <span className="font-mono text-slate-200">{selectedPoint.aspect}°</span>
            </div>
          </div>

          {/* Coordinates check - Honest distinction */}
          <div className="mt-2 pt-2 border-t border-dw-border/60 text-[11px]">
            {selectedPoint.latitude && selectedPoint.longitude ? (
              <div className="font-mono text-slate-300">
                <span className="text-slate-500">Lat/Lon:</span> {selectedPoint.latitude}°, {selectedPoint.longitude}°
              </div>
            ) : (
              <div className="text-amber-400/90 flex items-start gap-1 text-[10px] leading-tight">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Metric coordinates unavailable — image is not georeferenced.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Viewport Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};
