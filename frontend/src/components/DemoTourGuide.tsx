import React, { useState } from 'react';
import {
  Compass,
  ChevronRight,
  ChevronLeft,
  X,
  Play,
  Layers,
  Mountain,
  Globe,
  CheckCircle,
  FileText,
  Sparkles,
  Maximize2
} from 'lucide-react';

interface DemoTourGuideProps {
  currentTab: string;
  onNavigateToTab: (tab: string) => void;
  isMetric: boolean;
}

export const DemoTourGuide: React.FC<DemoTourGuideProps> = ({
  currentTab,
  onNavigateToTab,
  isMetric,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const steps = [
    {
      id: 'overview',
      tab: 'overview',
      number: 1,
      title: 'Geospatial Metadata & Pipeline',
      talkingPoints: [
        'Inspected real GeoTIFF tags: EPSG:32643 (UTM Zone 43N) at 0.25m ground resolution.',
        'Distinguishes Relative Surface vs Metric DSM — zero elevation fabrication.',
        '9-stage automated photogrammetry pipeline completed deterministically.',
      ],
      actionLabel: 'View Metadata Overview',
    },
    {
      id: 'analysis',
      tab: 'analysis',
      number: 2,
      title: 'AI Monocular Depth Estimation',
      talkingPoints: [
        'Depth Anything V2 monocular foundation model extracts continuous disparity.',
        'Drag the split-comparison slider to compare optical texture with depth relief.',
        'Adjust contrast and opacity controls to reveal fine structural edges.',
      ],
      actionLabel: 'Inspect AI Disparity Slider',
    },
    {
      id: 'elevation',
      tab: 'elevation',
      number: 3,
      title: 'Affine GCP & DEM Calibration',
      talkingPoints: [
        'Mathematical transformation: H(x, y) = a · D(x, y) + b from relative to meters.',
        '4 Ground Control Points (GCPs) tie surveyed heights with least-squares regression.',
        'DEM co-registration tab allows external GeoTIFF elevation warping.',
      ],
      actionLabel: 'Test Elevation Calibration',
    },
    {
      id: '3d',
      tab: '3d',
      number: 4,
      title: 'Interactive 3D Terrain World',
      talkingPoints: [
        'Full WebGL Three.js displaced surface mesh with solid geological pedestal skirts.',
        'Click "START FLYTHROUGH" for automated cinematic drone inspection.',
        'Switch between 6 view modes: RGB, Elevation, Hillshade, Slope, Depth, Wireframe.',
        'Click any building rooftop for real-time raycasting elevation & slope query.',
      ],
      actionLabel: 'Explore 3D Terrain',
    },
    {
      id: 'validate',
      tab: 'validate',
      number: 5,
      title: 'LiDAR Validation & Report Export',
      talkingPoints: [
        'Tri-panel validation: Reference LiDAR vs DepthWizard DSM vs Error Residuals.',
        'High accuracy: RMSE: 0.64m, MAE: 0.51m, Pearson correlation r: 0.997.',
        'Measurements: Commercial tower height 28.5m & boulevard span 127.4m.',
        'Export printable scientific HTML report, 3D OBJ mesh, and GeoTIFF DSM.',
      ],
      actionLabel: 'View Validation & Export',
    },
  ];

  const currentStep = steps[currentStepIndex];

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      onNavigateToTab(steps[nextIdx].tab);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      const prevIdx = currentStepIndex - 1;
      setCurrentStepIndex(prevIdx);
      onNavigateToTab(steps[prevIdx].tab);
    }
  };

  const handleSelectStep = (idx: number) => {
    setCurrentStepIndex(idx);
    onNavigateToTab(steps[idx].tab);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-12 left-4 z-40 glass-panel-glow px-3 py-2 rounded-xl border border-dw-cyan text-dw-cyan hover:bg-dw-surface shadow-glow-cyan flex items-center gap-2 text-xs font-mono font-bold transition-all group select-none"
        title="Open 5-Minute Interactive Product Tour"
      >
        <Sparkles className="w-4 h-4 text-dw-cyan group-hover:rotate-12 transition-transform" />
        <span>PRODUCT TOUR GUIDE</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-12 left-4 z-40 w-96 glass-panel-glow rounded-2xl border border-dw-cyan/60 p-4 shadow-2xl backdrop-blur-xl select-none text-slate-100 font-sans animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-dw-border/80 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-dw-cyan/20 border border-dw-cyan/40 flex items-center justify-center text-dw-cyan">
            <Compass className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold font-mono text-slate-100 tracking-wide">
            DEPTHWIZARD • 5-MIN PRODUCT TOUR
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[10px] font-mono text-dw-cyan px-2 py-0.5 rounded bg-dw-cyan/10 border border-dw-cyan/30">
            Step {currentStep.number} / 5
          </span>
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-dw-surface"
            title="Minimize Guide"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Step Pills */}
      <div className="flex items-center gap-1 mb-3">
        {steps.map((s, idx) => (
          <button
            key={s.id}
            onClick={() => handleSelectStep(idx)}
            className={`flex-1 h-1.5 rounded-full transition-all ${
              idx === currentStepIndex
                ? 'bg-dw-cyan shadow-glow-cyan'
                : idx < currentStepIndex
                ? 'bg-dw-cyan/40'
                : 'bg-dw-border'
            }`}
            title={`Step ${s.number}: ${s.title}`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="space-y-2.5">
        <div>
          <span className="text-[10px] font-mono uppercase text-dw-cyan font-bold tracking-wider">
            STEP {currentStep.number}: {currentStep.id.toUpperCase()}
          </span>
          <h4 className="text-sm font-bold text-slate-100 font-mono leading-snug">
            {currentStep.title}
          </h4>
        </div>

        {/* Talking Points */}
        <div className="p-2.5 rounded-xl bg-dw-surface/80 border border-dw-border text-[11px] text-slate-300 space-y-1.5 leading-relaxed font-sans">
          {currentStep.talkingPoints.map((pt, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span className="text-dw-cyan font-bold">•</span>
              <span>{pt}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-3 pt-2.5 border-t border-dw-border/80 flex items-center justify-between">
        <button
          onClick={handlePrev}
          disabled={currentStepIndex === 0}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none hover:bg-dw-surface transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <button
          onClick={() => onNavigateToTab(currentStep.tab)}
          className="px-3 py-1.5 rounded-lg text-xs font-bold font-mono bg-dw-cyan/20 text-dw-cyan hover:bg-dw-cyan/30 border border-dw-cyan/50 transition-all"
        >
          {currentStep.actionLabel}
        </button>

        <button
          onClick={handleNext}
          disabled={currentStepIndex === steps.length - 1}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono text-dw-cyan font-semibold hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-dw-surface transition-colors"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
