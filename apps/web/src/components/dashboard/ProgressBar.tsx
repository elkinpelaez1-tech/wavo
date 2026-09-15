import React, { useEffect, useState } from 'react';

interface ProgressBarProps {
  label: string;
  percentage: number;
  color: string;
  delay?: number;
}

export function ProgressBar({ label, percentage, color, delay = 0 }: ProgressBarProps) {
  const [width, setWidth] = useState(0);
  const pct = Math.max(0, Math.min(100, isNaN(percentage) ? 0 : percentage));

  useEffect(() => {
    const timer = setTimeout(() => setWidth(pct), 100 + delay);
    return () => clearTimeout(timer);
  }, [pct, delay]);
  
  return (
    <div className="flex items-center gap-3 mb-3 group">
      <span className="text-[11px] font-semibold text-[#64716B] w-[75px] shrink-0 group-hover:text-[#17201C] transition-colors">{label}</span>
      <div className="flex-1 h-2.5 bg-[#F1FAF5] border border-[#E4ECE7] rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-1000 ease-out shadow-xs" 
          style={{ width: `${width}%`, backgroundColor: color }} 
        />
      </div>
      <span className="text-xs font-bold text-[#17201C] w-[40px] text-right tracking-tight">{pct}%</span>
    </div>
  );
}
