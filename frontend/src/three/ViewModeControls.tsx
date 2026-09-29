import React from 'react';
import { ViewMode } from '../types';
import { Layers, Image, Eye, Mountain, Grid, Activity, Sun } from 'lucide-react';

interface ViewModeControlsProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  wireframe: boolean;
  onToggleWireframe: () => void;
  verticalExaggeration: number;
  onExaggerationChange: (val: number) => void;
  minElevation?: number;
  maxElevation?: number;
  elevationUnit?: string;
}

export const ViewModeControls: React.FC<ViewModeControlsProps> = ({
  currentMode,
  onModeChange,
  wireframe,
  onToggleWireframe,
  verticalExaggeration,
  onExaggerationChange,
  minElevation = 38.0,
  maxElevation = 72.0,
  elevationUnit = 'm',
}) => {
  const modes: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
    { id: 'rgb', label: 'RGB Texture', icon: <Image className="w-3.5 h-3.5" /> },
    { id: 'depth', label: 'AI Depth', icon: <Eye className="w-3.5 h-3.5" /> },
    { id: 'elevation', label: 'Elevation', icon: <Mountain className="w-3.5 h-3.5" /> },
    { id: 'hillshade', label: 'Hillshade', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'slope', label: 'Slope', icon: <Activity className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
      {/* View Mode Pills */}
      <div className="glass-panel p-1.5 rounded-lg flex items-center gap-1 shadow-lg border border-dw-border">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => onModeChange(m.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              currentMode === m.id
                ? 'bg-dw-cyan/20 text-dw-cyan border border-dw-cyan/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-dw-surface'
            }`}
            title={`Switch to ${m.label} visualization`}
          >
            {m.icon}
            <span className="hidden md:inline">{m.label}</span>
          </button>
        ))}

        <div className="w-[1px] h-5 bg-dw-border mx-1" />

        {/* Wireframe Toggle */}
        <button
          onClick={onToggleWireframe}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
            wireframe
              ? 'bg-dw-cyan/20 text-dw-cyan border border-dw-cyan/60 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-dw-surface'
          }`}
          title="Toggle mesh wireframe overlay"
        >
          <Grid className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Wireframe</span>
        </button>
      </div>

      {/* Row 2: Z-Scale Slider & Mode-Specific Legend */}
      <div className="flex items-center gap-2">
        {/* Z-Exaggeration Slider */}
        <div className="glass-panel px-3 py-1.5 rounded-lg flex items-center gap-3 w-fit shadow-md border border-dw-border text-xs text-slate-300">
          <span className="font-mono text-slate-400 text-[11px] whitespace-nowrap">Z-Scale:</span>
          <input
            type="range"
            min="0.2"
            max="3.0"
            step="0.1"
            value={verticalExaggeration}
            onChange={(e) => onExaggerationChange(parseFloat(e.target.value))}
            className="w-20 h-1.5 bg-dw-surface rounded-lg cursor-pointer"
          />
          <span className="font-mono text-dw-cyan text-[11px] w-8 text-right">
            {verticalExaggeration.toFixed(1)}×
          </span>
        </div>

        {/* Live Elevation Legend when in Elevation mode */}
        {currentMode === 'elevation' && (
          <div className="glass-panel px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-md border border-dw-border text-xs">
            <span className="font-mono text-[10px] text-slate-400">{minElevation} {elevationUnit}</span>
            <div className="w-24 h-2.5 rounded bg-gradient-to-r from-[#304FFE] via-[#00E676] via-[#FFD600] to-[#D50000] border border-dw-border/80 shadow-inner" />
            <span className="font-mono text-[10px] text-dw-cyan font-bold">{maxElevation} {elevationUnit}</span>
          </div>
        )}

        {/* Live Slope Legend when in Slope mode */}
        {currentMode === 'slope' && (
          <div className="glass-panel px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-md border border-dw-border text-xs">
            <span className="font-mono text-[10px] text-slate-400">0° (Flat)</span>
            <div className="w-24 h-2.5 rounded bg-gradient-to-r from-[#000004] via-[#721F81] via-[#F1605D] to-[#FCFDBF] border border-dw-border/80 shadow-inner" />
            <span className="font-mono text-[10px] text-amber-300 font-bold">&gt;40° (Steep)</span>
          </div>
        )}

        {/* Sun info when in Hillshade mode */}
        {currentMode === 'hillshade' && (
          <div className="glass-panel px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-md border border-dw-border text-xs text-slate-400 font-mono text-[10px]">
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>Sun: Azimuth 315° • Altitude 45°</span>
          </div>
        )}
      </div>
    </div>
  );
};
