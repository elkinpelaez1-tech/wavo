import React from 'react';

interface MetricCardProps {
  label: string;
  value: string;
  sub: string;
  isWarning?: boolean;
}

export function MetricCard({ label, value, sub, isWarning = false }: MetricCardProps) {
  return (
    <div className="bg-white border border-[#E4ECE7] rounded-2xl p-5 shadow-xs hover:shadow-sm hover:border-[#0F8F6F]/30 hover:-translate-y-0.5 transition-all duration-200">
      <div className="text-[11px] font-semibold text-[#64716B] uppercase tracking-wider mb-2">{label}</div>
      <div className="text-2xl lg:text-3xl font-bold text-[#17201C] tracking-tight mb-2.5">{value}</div>
      <div className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
        isWarning
          ? 'bg-amber-50 text-amber-800 border border-amber-200/60'
          : 'bg-[#E8F7F0] text-[#065F46] border border-[#0F8F6F]/20'
      }`}>
        {sub.startsWith('↑') && !isWarning ? (
          <>
            <span className="text-[#0F8F6F] font-bold">{sub.split(' ')[0]}</span>
            <span>{sub.substring(sub.split(' ')[0].length)}</span>
          </>
        ) : sub}
      </div>
    </div>
  );
}
