import React from 'react';
import { Navigation } from 'lucide-react';

interface CompassGizmoProps {
  onResetNorth?: () => void;
}

export const CompassGizmo: React.FC<CompassGizmoProps> = ({ onResetNorth }) => {
  return (
    <div
      onClick={onResetNorth}
      className="glass-panel p-2 rounded-full cursor-pointer hover:border-dw-cyan transition-all shadow-lg flex items-center justify-center w-10 h-10 border border-dw-border group"
      title="Reset Camera to North"
    >
      <div className="relative flex items-center justify-center">
        <Navigation className="w-5 h-5 text-dw-cyan group-hover:scale-110 transition-transform -rotate-45" />
        <span className="absolute -top-3 text-[9px] font-bold text-dw-cyan font-mono">N</span>
      </div>
    </div>
  );
};
