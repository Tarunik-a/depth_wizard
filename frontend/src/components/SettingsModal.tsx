import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  Check,
  RotateCcw,
  Monitor,
  Layers,
  Compass,
  Palette,
  Eye
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface DepthWizardSettings {
  elevationUnit: 'meters' | 'feet';
  verticalExaggeration: number;
  colormap: 'turbo' | 'viridis' | 'terrain' | 'magma';
  textureResolution: '1024' | '2048' | '4096';
  sunAzimuth: number;
  sunAltitude: number;
  showPedestal: boolean;
  fpsLimit: 30 | 60;
}

const DEFAULT_SETTINGS: DepthWizardSettings = {
  elevationUnit: 'meters',
  verticalExaggeration: 1.5,
  colormap: 'turbo',
  textureResolution: '2048',
  sunAzimuth: 315,
  sunAltitude: 45,
  showPedestal: true,
  fpsLimit: 60,
};

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<DepthWizardSettings>(() => {
    try {
      const saved = localStorage.getItem('dw_settings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      // ignore
    }
    return DEFAULT_SETTINGS;
  });

  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    localStorage.setItem('dw_settings', JSON.stringify(settings));
  }, [settings]);

  if (!isOpen) return null;

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="glass-panel w-full max-w-xl rounded-2xl border border-dw-border/80 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-dw-border flex items-center justify-between bg-dw-surface/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-dw-cyan/20 border border-dw-cyan/40 flex items-center justify-center text-dw-cyan">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-mono text-slate-100 uppercase tracking-wider">
                Platform Settings
              </h2>
              <p className="text-xs text-slate-400">
                Configure 3D graphics, elevation units, and geospatial rendering
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-dw-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
          {/* Elevation & Measurement */}
          <div className="space-y-3">
            <h3 className="font-mono text-xs font-bold text-dw-cyan uppercase flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5" />
              <span>Elevation & Measurement Units</span>
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSettings({ ...settings, elevationUnit: 'meters' })}
                className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                  settings.elevationUnit === 'meters'
                    ? 'border-dw-cyan bg-dw-cyan/10 text-slate-100 shadow-glow-cyan'
                    : 'border-dw-border bg-dw-surface/40 hover:bg-dw-surface text-slate-400'
                }`}
              >
                <div>
                  <div className="font-bold font-mono">Meters (m)</div>
                  <div className="text-[10px] text-slate-400">International standard (SI)</div>
                </div>
                {settings.elevationUnit === 'meters' && <Check className="w-4 h-4 text-dw-cyan" />}
              </button>
              <button
                onClick={() => setSettings({ ...settings, elevationUnit: 'feet' })}
                className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                  settings.elevationUnit === 'feet'
                    ? 'border-dw-cyan bg-dw-cyan/10 text-slate-100 shadow-glow-cyan'
                    : 'border-dw-border bg-dw-surface/40 hover:bg-dw-surface text-slate-400'
                }`}
              >
                <div>
                  <div className="font-bold font-mono">Feet (ft)</div>
                  <div className="text-[10px] text-slate-400">Imperial elevation scale</div>
                </div>
                {settings.elevationUnit === 'feet' && <Check className="w-4 h-4 text-dw-cyan" />}
              </button>
            </div>
          </div>

          {/* 3D Rendering & Lighting */}
          <div className="space-y-3">
            <h3 className="font-mono text-xs font-bold text-dw-cyan uppercase flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5" />
              <span>3D Surface & Lighting</span>
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1.5 text-xs">
                  <span className="text-slate-300">Default Vertical Exaggeration</span>
                  <span className="font-mono text-dw-cyan">{settings.verticalExaggeration.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="4.0"
                  step="0.1"
                  value={settings.verticalExaggeration}
                  onChange={(e) =>
                    setSettings({ ...settings, verticalExaggeration: parseFloat(e.target.value) })
                  }
                  className="w-full accent-dw-cyan cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1.5 text-xs">
                  <span className="text-slate-300">Texture Projection Resolution</span>
                  <span className="font-mono text-dw-cyan">{settings.textureResolution} px</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['1024', '2048', '4096'] as const).map((res) => (
                    <button
                      key={res}
                      onClick={() => setSettings({ ...settings, textureResolution: res })}
                      className={`py-1.5 px-3 rounded-lg border font-mono text-xs transition-all ${
                        settings.textureResolution === res
                          ? 'border-dw-cyan bg-dw-cyan/15 text-dw-cyan'
                          : 'border-dw-border bg-dw-surface text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {res}px
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Colormap Theme */}
          <div className="space-y-3">
            <h3 className="font-mono text-xs font-bold text-dw-cyan uppercase flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" />
              <span>Elevation Colormap Ramp</span>
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  { id: 'turbo', label: 'Turbo' },
                  { id: 'viridis', label: 'Viridis' },
                  { id: 'terrain', label: 'Terrain' },
                  { id: 'magma', label: 'Magma' },
                ] as const
              ).map((cmap) => (
                <button
                  key={cmap.id}
                  onClick={() => setSettings({ ...settings, colormap: cmap.id })}
                  className={`py-2 px-2.5 rounded-lg border text-center transition-all ${
                    settings.colormap === cmap.id
                      ? 'border-dw-cyan bg-dw-cyan/15 text-dw-cyan font-bold'
                      : 'border-dw-border bg-dw-surface text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-mono capitalize">{cmap.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-dw-border bg-dw-surface/80 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 hover:underline"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Defaults</span>
          </button>
          <div className="flex items-center gap-2">
            {savedToast && (
              <span className="text-xs text-dw-green font-mono">Preferences saved</span>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-dw-cyan text-dw-bg hover:bg-dw-cyan/90 transition-colors shadow-glow-cyan"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
