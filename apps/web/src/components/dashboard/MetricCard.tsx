import React from 'react';

interface MetricCardProps {
  label: string;
  value: string;
  sub: string;
  isWarning?: boolean;
}

export function MetricCard({ label, value, sub, isWarning = false }: MetricCardProps) {
  return (
    <div className="bg-[#FDFCF5] border border-[#EDE8D0] rounded-xl p-5 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all duration-300">
      <div className="text-[12px] font-medium text-[#908c72] uppercase tracking-wider mb-2">{label}</div>
      <div className="text-3xl font-semibold text-[#2c2a1e] tracking-tight mb-2.5">{value}</div>
      <div className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
        isWarning ? 'bg-[#F0997B]/10 text-[#BA7517]' : 'bg-wavo-green/10 text-wavo-green'
      }`}>
        {sub}
      </div>
    </div>
  );
}
