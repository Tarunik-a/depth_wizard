import React, { useState, useRef, useCallback } from 'react';

interface ComparisonSliderProps {
  leftImage: string;
  rightImage: string;
  leftLabel?: string;
  rightLabel?: string;
  rightStyle?: React.CSSProperties;
}

export const ComparisonSlider: React.FC<ComparisonSliderProps> = ({
  leftImage,
  rightImage,
  leftLabel = 'ORIGINAL IMAGE',
  rightLabel = 'AI DEPTH MAP',
  rightStyle,
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.max(0, Math.min((x / rect.width) * 100, 100));
    setSliderPosition(percent);
  }, []);

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    handleMove(e.touches[0].clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[540px] select-none overflow-hidden rounded-xl border border-dw-border bg-dw-bg cursor-ew-resize shadow-2xl"
      onMouseDown={() => setIsDragging(true)}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
      onMouseMove={handleMouseMove}
      onTouchStart={() => setIsDragging(true)}
      onTouchEnd={() => setIsDragging(false)}
      onTouchMove={handleTouchMove}
    >
      {/* Right Image (Background) */}
      <img
        src={rightImage}
        alt={rightLabel}
        style={rightStyle}
        className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-all duration-100"
      />
      <div className="absolute top-4 right-4 z-10 glass-panel px-3 py-1 rounded text-xs font-mono font-bold text-dw-cyan border border-dw-border">
        {rightLabel}
      </div>

      {/* Left Image (Clipped Overlay) */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ width: `${sliderPosition}%` }}
      >
        <img
          src={leftImage}
          alt={leftLabel}
          className="absolute inset-0 w-full h-full object-contain max-w-none"
          style={{ width: containerRef.current?.clientWidth || '100%' }}
        />
        <div className="absolute top-4 left-4 z-10 glass-panel px-3 py-1 rounded text-xs font-mono font-bold text-slate-200 border border-dw-border">
          {leftLabel}
        </div>
      </div>

      {/* Draggable Divider Line & Handle */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-dw-cyan cursor-ew-resize shadow-glow-cyan z-20 pointer-events-none"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-dw-panel border-2 border-dw-cyan flex items-center justify-center shadow-lg pointer-events-auto">
          <div className="flex gap-1">
            <span className="w-0.5 h-3 bg-dw-cyan rounded" />
            <span className="w-0.5 h-3 bg-dw-cyan rounded" />
          </div>
        </div>
      </div>
    </div>
  );
};
