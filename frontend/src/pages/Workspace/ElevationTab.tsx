import React, { useState, useRef } from 'react';
import { Project, GCPPoint } from '../../types';
import { api } from '../../api/client';
import {
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Layers,
  Crosshair,
  TrendingUp,
  Plus,
  Trash2,
  ArrowRight
} from 'lucide-react';

interface ElevationTabProps {
  project: Project;
  onProjectUpdated: (project: Project) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const ElevationTab: React.FC<ElevationTabProps> = ({
  project,
  onProjectUpdated,
  onNavigateToTab,
}) => {
  const [method, setMethod] = useState<'gcp' | 'dem'>(
    project.calibration.method === 'dem' ? 'dem' : 'gcp'
  );
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [isDemUploading, setIsDemUploading] = useState(false);
  const [demError, setDemError] = useState<string | null>(null);
  const [isDraggingDem, setIsDraggingDem] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const demFileInputRef = useRef<HTMLInputElement>(null);

  // Default GCP points from project or initial seeds
  const [points, setPoints] = useState<GCPPoint[]>(
    project.calibration.points.length > 0
      ? project.calibration.points
      : [
          { id: 'GCP-01', pixel_x: 120, pixel_y: 255, known_elevation: 42.8 },
          { id: 'GCP-02', pixel_x: 60, pixel_y: 80, known_elevation: 72.1 },
          { id: 'GCP-03', pixel_x: 320, pixel_y: 90, known_elevation: 54.2 },
          { id: 'GCP-04', pixel_x: 340, pixel_y: 450, known_elevation: 66.5 },
        ]
  );

  const [newElevation, setNewElevation] = useState<string>('50.0');

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const yRatio = (e.clientY - rect.top) / rect.height;

    const w = project.image_metadata?.width || 512;
    const h = project.image_metadata?.height || 512;

    const pixel_x = Math.round(xRatio * w);
    const pixel_y = Math.round(yRatio * h);

    const newPt: GCPPoint = {
      id: `GCP-0${points.length + 1}`,
      pixel_x,
      pixel_y,
      known_elevation: parseFloat(newElevation) || 50.0,
    };

    setPoints([...points, newPt]);
  };

  const handleRemovePoint = (id: string) => {
    setPoints(points.filter((p) => p.id !== id));
  };

  const handleCalibrate = async () => {
    if (points.length < 2) return;
    try {
      setIsCalibrating(true);
      const updated = await api.calibrateGCP(project.id, points);
      onProjectUpdated(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCalibrating(false);
    }
  };

  const handleDemUpload = async (file: File) => {
    if (!file) return;
    try {
      setIsDemUploading(true);
      setDemError(null);
      const updated = await api.calibrateDEM(project.id, file);
      onProjectUpdated(updated);
    } catch (err: any) {
      setDemError(err.message || 'DEM calibration failed');
    } finally {
      setIsDemUploading(false);
    }
  };

  const calib = project.calibration;
  const isCalibrated = calib.status === 'calibrated';

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 font-mono">
            ELEVATION CALIBRATION & DSM RECONSTRUCTION
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Calibrate Monocular Depth into Absolute Metric Heights using Ground Control Points (GCPs) or Reference DEM
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Method Toggle Buttons */}
          <div className="glass-panel p-1 rounded-lg flex items-center border border-dw-border">
            <button
              onClick={() => setMethod('gcp')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                method === 'gcp'
                  ? 'bg-dw-cyan/20 text-dw-cyan border border-dw-cyan/50 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ground Control Points (GCP)
            </button>
            <button
              onClick={() => setMethod('dem')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                method === 'dem'
                  ? 'bg-dw-blue/20 text-dw-blue border border-dw-blue/50 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Digital Elevation Model (DEM)
            </button>
          </div>

          {onNavigateToTab && (
            <button
              onClick={() => onNavigateToTab('3d')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-dw-cyan to-dw-blue text-dw-bg hover:opacity-90 shadow-glow-cyan transition-all font-mono"
            >
              <span>Explore in 3D</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {method === 'gcp' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Interactive Image for Placing GCPs */}
          <div className="glass-panel p-5 rounded-xl border border-dw-border flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 uppercase font-mono flex items-center gap-1.5">
                <Crosshair className="w-4 h-4 text-dw-cyan" />
                <span>Click Image to Position GCP Tie-Points</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-mono">Input Elev:</span>
                <input
                  type="number"
                  step="0.5"
                  value={newElevation}
                  onChange={(e) => setNewElevation(e.target.value)}
                  className="w-16 px-1.5 py-0.5 text-xs bg-dw-surface border border-dw-border rounded font-mono text-dw-cyan"
                  placeholder="50.0"
                />
                <span className="text-[10px] text-slate-400 font-mono">m</span>
              </div>
            </div>

            {/* Clickable Image Container */}
            <div className="relative rounded-lg overflow-hidden border border-dw-border bg-black select-none cursor-crosshair">
              <img
                ref={imgRef}
                src={project.image_url || '/placeholder.png'}
                alt="Optical Imagery for GCP positioning"
                onClick={handleImageClick}
                className="w-full h-auto object-contain block"
              />

              {/* Render GCP Markers */}
              {points.map((p) => {
                const w = project.image_metadata?.width || 512;
                const h = project.image_metadata?.height || 512;
                const leftPct = (p.pixel_x / w) * 100;
                const topPct = (p.pixel_y / h) * 100;

                return (
                  <div
                    key={p.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center"
                    style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                  >
                    <div className="w-5 h-5 rounded-full bg-dw-cyan/40 border-2 border-dw-cyan flex items-center justify-center text-[9px] font-bold text-dw-bg">
                      <Crosshair className="w-3 h-3 text-dw-cyan" />
                    </div>
                    <span className="bg-dw-surface/90 text-dw-cyan border border-dw-cyan/40 text-[9px] font-mono px-1 rounded shadow mt-0.5 whitespace-nowrap">
                      {p.id}: {p.known_elevation}m
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-slate-500 font-mono">
              Click anywhere on the satellite image above to place tie-points with known survey heights.
            </p>
          </div>

          {/* Right Col: GCP Points Table & Calibration Formula */}
          <div className="space-y-6">
            <div className="glass-panel p-5 rounded-xl border border-dw-border space-y-4">
              <div className="flex items-center justify-between border-b border-dw-border pb-3">
                <span className="text-xs font-bold text-slate-200 uppercase font-mono flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-dw-cyan" />
                  <span>Ground Control Points ({points.length})</span>
                </span>

                <button
                  onClick={handleCalibrate}
                  disabled={isCalibrating || points.length < 2}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-dw-cyan to-dw-blue text-dw-bg hover:opacity-90 disabled:opacity-50 shadow-glow-cyan transition-all"
                >
                  {isCalibrating ? 'Calculating Fit...' : 'CALIBRATE ELEVATION'}
                </button>
              </div>

              {/* Points Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-dw-border text-slate-400 font-mono text-[11px]">
                      <th className="pb-2">Point ID</th>
                      <th className="pb-2">Pixel (X, Y)</th>
                      <th className="pb-2">Known (m)</th>
                      <th className="pb-2">Predicted</th>
                      <th className="pb-2">Residual</th>
                      <th className="pb-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dw-border/50 font-mono">
                    {points.map((p) => (
                      <tr key={p.id} className="text-slate-300">
                        <td className="py-2 text-dw-cyan font-bold">{p.id}</td>
                        <td className="py-2 text-slate-400">
                          {p.pixel_x}, {p.pixel_y}
                        </td>
                        <td className="py-2 text-slate-100 font-semibold">
                          {p.known_elevation.toFixed(1)} m
                        </td>
                        <td className="py-2 text-slate-300">
                          {p.predicted_elevation !== undefined && p.predicted_elevation !== null
                            ? `${p.predicted_elevation.toFixed(1)} m`
                            : '—'}
                        </td>
                        <td className="py-2">
                          {p.residual !== undefined && p.residual !== null ? (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] ${
                                Math.abs(p.residual) < 0.5
                                  ? 'bg-dw-green/10 text-dw-green'
                                  : 'bg-amber-500/10 text-amber-300'
                              }`}
                            >
                              {p.residual > 0 ? `+${p.residual.toFixed(2)}` : p.residual.toFixed(2)} m
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-2">
                          <button
                            onClick={() => handleRemovePoint(p.id)}
                            className="text-slate-500 hover:text-dw-red transition-colors"
                            title="Remove Point"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Calibration Formula & Model Quality Card */}
            <div className="glass-panel p-5 rounded-xl border border-dw-border space-y-3">
              <span className="text-xs font-bold text-slate-200 uppercase font-mono flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-dw-green" />
                <span>Affine Calibration Solution</span>
              </span>

              <div className="p-3 rounded-lg bg-dw-surface border border-dw-border font-mono text-xs">
                <div className="text-slate-400 text-[11px] mb-1">Affine Elevation Transformation:</div>
                <div className="text-sm font-bold text-dw-cyan">
                  H(x, y) = {calib.scale_a.toFixed(3)} × D(x, y) + {calib.offset_b.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  where D is AI relative depth in [0, 1] and H is calibrated metric elevation.
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-dw-surface border border-dw-border">
                  <span className="text-slate-400 text-[11px] block font-mono">Fit Residual RMSE:</span>
                  <span className="font-bold text-slate-200 font-mono text-sm">
                    {calib.rmse ? `${calib.rmse.toFixed(2)} m` : 'Uncalibrated'}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-dw-surface border border-dw-border">
                  <span className="text-slate-400 text-[11px] block font-mono">R² Goodness of Fit:</span>
                  <span className="font-bold text-dw-green font-mono text-sm">
                    {calib.r_squared ? calib.r_squared.toFixed(3) : '—'}
                  </span>
                </div>
              </div>

              {calib.message && (
                <div className="text-[11px] font-mono text-slate-300 bg-dw-surface/80 p-2 rounded border border-dw-border">
                  {calib.message}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* DEM Upload Mode */
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Hidden File Input */}
          <input
            ref={demFileInputRef}
            type="file"
            accept=".tif,.tiff"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleDemUpload(file);
            }}
          />

          {/* Active DEM Status Card if calibrated */}
          {calib.status === 'calibrated' && calib.method === 'dem' ? (
            <div className="glass-panel p-6 rounded-xl border border-dw-green/40 bg-dw-surface/80 space-y-5">
              <div className="flex items-center justify-between border-b border-dw-border pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-dw-green" />
                  <span className="text-sm font-bold text-slate-100 font-mono">
                    DEM CALIBRATION ACTIVE & VERIFIED
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-mono bg-dw-green/20 text-dw-green border border-dw-green/40">
                  Metric DSM Mode
                </span>
              </div>

              {/* Affine Transformation Box */}
              <div className="p-4 rounded-lg bg-dw-bg/80 border border-dw-border font-mono text-xs space-y-1.5">
                <div className="text-slate-400 text-[11px]">Calibrated Affine Elevation Transfer Function:</div>
                <div className="text-base font-bold text-dw-cyan">
                  H(x, y) = {calib.scale_a.toFixed(3)} × D(x, y) + {calib.offset_b.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-500">
                  Source relative depth warped to reference DEM grid in absolute meters (m).
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-dw-surface border border-dw-border">
                  <span className="text-slate-400 text-[11px] block font-mono">Fit Residual RMSE:</span>
                  <span className="font-bold text-slate-200 font-mono text-sm">
                    {calib.rmse !== null && calib.rmse !== undefined ? `${calib.rmse.toFixed(2)} m` : '—'}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-dw-surface border border-dw-border">
                  <span className="text-slate-400 text-[11px] block font-mono">R² Correlation:</span>
                  <span className="font-bold text-dw-green font-mono text-sm">
                    {calib.r_squared !== null && calib.r_squared !== undefined ? calib.r_squared.toFixed(3) : '—'}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-dw-surface border border-dw-border">
                  <span className="text-slate-400 text-[11px] block font-mono">Elevation Span:</span>
                  <span className="font-bold text-slate-200 font-mono text-sm">
                    {project.terrain_stats ? `${project.terrain_stats.min_elevation}m – ${project.terrain_stats.max_elevation}m` : '—'}
                  </span>
                </div>
              </div>

              {calib.message && (
                <div className="text-[11px] font-mono text-slate-300 bg-dw-surface/80 p-2.5 rounded border border-dw-border">
                  {calib.message}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => demFileInputRef.current?.click()}
                  disabled={isDemUploading}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono border border-dw-border text-slate-300 hover:text-white hover:bg-dw-surface transition-colors"
                >
                  Upload Different DEM
                </button>

                {onNavigateToTab && (
                  <button
                    onClick={() => onNavigateToTab('3d')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-dw-cyan to-dw-blue text-dw-bg hover:opacity-90 shadow-glow-cyan transition-all font-mono"
                  >
                    <span>Inspect 3D Terrain</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : null}

          {/* Upload Dropzone */}
          <div className="glass-panel p-8 rounded-xl border border-dw-border text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-dw-blue/10 border border-dw-blue/30 text-dw-blue flex items-center justify-center mx-auto">
              <Upload className={`w-6 h-6 ${isDemUploading ? 'animate-bounce text-dw-cyan' : ''}`} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 font-mono">
                {isCalibrated && calib.method === 'dem'
                  ? 'Replace Reference Digital Elevation Model'
                  : 'Upload Reference Digital Elevation Model (DEM)'}
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Upload a co-registered GeoTIFF DEM (SRTM, ALOS, or LiDAR raster) to compute affine parameters and transform relative AI depth into calibrated metric elevation ($m$).
              </p>
            </div>

            {demError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-dw-red/10 border border-dw-red/40 text-dw-red text-xs font-mono max-w-md mx-auto text-left">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{demError}</span>
              </div>
            )}

            <div
              onClick={() => !isDemUploading && demFileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingDem(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDraggingDem(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingDem(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleDemUpload(file);
              }}
              className={`border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all ${
                isDraggingDem
                  ? 'border-dw-cyan bg-dw-cyan/10 scale-[1.01]'
                  : 'border-dw-border hover:border-dw-cyan bg-dw-surface/50'
              } ${isDemUploading ? 'opacity-60 pointer-events-none' : ''}`}
            >
              {isDemUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-dw-cyan border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-mono text-dw-cyan font-semibold">
                    Co-registering DEM raster & calculating affine fit...
                  </span>
                </div>
              ) : (
                <>
                  <span className="text-xs text-slate-300 font-medium block">
                    Click to select DEM GeoTIFF (.tif, .tiff) or drag and drop here
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-1 font-mono">
                    Supported formats: GeoTIFF (.tif) with EPSG:4326 or projected UTM coordinates
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
