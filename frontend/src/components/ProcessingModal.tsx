import React from 'react';
import { PipelineStep } from '../types';
import { CheckCircle2, Loader2, Circle, AlertCircle } from 'lucide-react';

interface ProcessingModalProps {
  isOpen: boolean;
  projectName: string;
  progress: number;
  currentStep: string;
  pipelineSteps: PipelineStep[];
}

export const ProcessingModal: React.FC<ProcessingModalProps> = ({
  isOpen,
  projectName,
  progress,
  currentStep,
  pipelineSteps,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="glass-panel-glow w-full max-w-lg rounded-2xl p-6 border border-dw-cyan/50 shadow-2xl">
        <div className="flex items-center justify-between border-b border-dw-border pb-4 mb-4">
          <div>
            <h3 className="text-lg font-bold text-dw-cyan tracking-wider font-mono">
              DEPTHWIZARD PROCESSING
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Project: <span className="text-slate-200">{projectName}</span>
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-mono font-extrabold text-dw-cyan">
              {progress}%
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-dw-surface rounded-full overflow-hidden mb-6 border border-dw-border">
          <div
            className="h-full bg-gradient-to-r from-dw-blue to-dw-cyan transition-all duration-300 shadow-glow-cyan"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step-by-step pipeline list */}
        <div className="space-y-3 max-h-[340px] overflow-y-auto pr-2">
          {pipelineSteps.map((step) => {
            const isCompleted = step.status === 'completed';
            const isInProgress = step.status === 'in_progress';
            const isFailed = step.status === 'failed';

            return (
              <div
                key={step.id}
                className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all ${
                  isInProgress
                    ? 'bg-dw-cyan/10 border-dw-cyan/40 text-dw-cyan'
                    : isCompleted
                    ? 'bg-dw-surface/40 border-dw-border/50 text-slate-300'
                    : 'bg-transparent border-transparent text-slate-500'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-dw-green" />
                  ) : isInProgress ? (
                    <Loader2 className="w-4 h-4 text-dw-cyan animate-spin" />
                  ) : isFailed ? (
                    <AlertCircle className="w-4 h-4 text-dw-red" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-600" />
                  )}
                </div>

                <div className="flex-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold ${isInProgress ? 'text-dw-cyan' : isCompleted ? 'text-slate-200' : 'text-slate-500'}`}>
                      {step.label}
                    </span>
                    <span className="text-[10px] font-mono uppercase text-slate-400">
                      {isCompleted ? 'Done' : isInProgress ? 'In Progress' : 'Pending'}
                    </span>
                  </div>
                  {step.detail && (
                    <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                      {step.detail}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
