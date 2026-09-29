import React, { useEffect, useState } from 'react';
import { Project, HeightfieldData, SelectedPointInfo, ToolMode } from '../../types';
import { TerrainViewer } from '../../three/TerrainViewer';
import { api } from '../../api/client';
import { Loader2 } from 'lucide-react';

interface World3DTabProps {
  project: Project;
  onPointSelect?: (info: SelectedPointInfo) => void;
  toolMode?: ToolMode;
  onMeasurementPointAdd?: (pt: { x: number; y: number; z: number }) => void;
  activeMeasurementPoints?: { x: number; y: number; z: number }[];
  isPresentationMode?: boolean;
}

export const World3DTab: React.FC<World3DTabProps> = ({
  project,
  onPointSelect,
  toolMode = 'navigate',
  onMeasurementPointAdd,
  activeMeasurementPoints = [],
  isPresentationMode = false,
}) => {
  const [heightfield, setHeightfield] = useState<HeightfieldData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError(null);

    api
      .getMesh(project.id, 128)
      .then((data) => {
        if (mounted) {
          setHeightfield(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message || 'Failed to load terrain geometry');
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [project.id]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#070B13] gap-3">
        <Loader2 className="w-8 h-8 text-dw-cyan animate-spin" />
        <span className="text-xs font-mono text-slate-300">
          Generating 3D terrain surface from DSM displacement grid...
        </span>
      </div>
    );
  }

  if (error || !heightfield) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#070B13] p-6 text-center">
        <div className="glass-panel p-6 rounded-xl border border-dw-red/40 max-w-md">
          <h4 className="text-sm font-bold text-dw-red font-mono">
            3D RECONSTRUCTION UNAVAILABLE
          </h4>
          <p className="text-xs text-slate-400 mt-2">{error || 'Heightfield data missing'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <TerrainViewer
        project={project}
        heightfield={heightfield}
        toolMode={toolMode}
        onPointSelect={onPointSelect}
        onMeasurementPointAdd={onMeasurementPointAdd}
        activeMeasurementPoints={activeMeasurementPoints}
        isPresentationMode={isPresentationMode}
      />
    </div>
  );
};
