'use client';
import { useEffect, useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval,
         getDay, isSameDay, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '@/lib/api';

export default function CalendarPage() {
  const [current, setCurrent] = useState(new Date());
  const [campaigns, setCampaigns] = useState<any[]>([]);

  useEffect(() => {
    api.get('/campaigns').then(({ data }) => setCampaigns(data || []));
  }, []);

  const days = eachDayOfInterval({
    start: startOfMonth(current),
    end: endOfMonth(current),
  });

  const hasCampaign = (day: Date) =>
    campaigns.some(
      (c) => c.scheduled_at && isSameDay(new Date(c.scheduled_at), day),
    );

  const getCampaigns = (day: Date) =>
    campaigns.filter(
      (c) => c.scheduled_at && isSameDay(new Date(c.scheduled_at), day),
    );

  const firstDow = (getDay(startOfMonth(current)) + 6) % 7; // Lun=0
  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#17201C] tracking-tight">Calendario</h1>
          <p className="text-xs text-[#64716B] mt-1 font-medium">Cronograma de campañas programadas y envíos activos</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrent((d) => new Date(d.getFullYear(), d.getMonth() - 1))}
            className="btn-secondary px-3 py-1.5 text-xs shadow-2xs font-semibold"
          >
            ←
          </button>
          <span className="text-xs font-bold text-[#17201C] capitalize bg-[#F8FAF9] border border-[#E4ECE7] px-3 py-1.5 rounded-lg shadow-2xs">
            {format(current, 'MMMM yyyy', { locale: es })}
          </span>
          <button
            onClick={() => setCurrent((d) => new Date(d.getFullYear(), d.getMonth() + 1))}
            className="btn-secondary px-3 py-1.5 text-xs shadow-2xs font-semibold"
          >
            →
          </button>
        </div>
      </div>

      <div className="card space-y-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-[#E4ECE7] pb-2">
          {dayNames.map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-[#64716B] uppercase tracking-wider py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: firstDow }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[64px]" />
          ))}
          {days.map((day) => {
            const hasC = hasCampaign(day);
            const todayDay = isToday(day);
            const dayCampaigns = getCampaigns(day);

            return (
              <div
                key={day.toISOString()}
                className={`relative min-h-[64px] p-1.5 rounded-xl border transition-colors ${
                  todayDay
                    ? 'bg-[#0F8F6F] border-[#0F8F6F] shadow-2xs'
                    : hasC
                    ? 'bg-[#E8F7F0] border-[#0F8F6F]/30'
                    : 'border-transparent hover:bg-[#F8FAF9]'
                }`}
              >
                <span className={`text-xs font-bold ${todayDay ? 'text-white' : hasC ? 'text-[#065F46]' : 'text-[#64716B]'}`}>
                  {format(day, 'd')}
                </span>
                {dayCampaigns.slice(0, 2).map((c) => (
                  <div key={c.id} className="mt-1 text-[11px] font-medium truncate text-[#065F46] bg-white/80 border border-[#0F8F6F]/10 rounded-md px-1.5 py-0.5 shadow-2xs">
                    {c.name}
                  </div>
                ))}
                {dayCampaigns.length > 2 && (
                  <div className="text-[10px] text-[#64716B] font-semibold mt-0.5">+{dayCampaigns.length - 2}</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-4 pt-3 border-t border-[#E4ECE7]">
          <div className="flex items-center gap-2 text-xs text-[#64716B] font-medium">
            <div className="w-3 h-3 rounded-md bg-[#E8F7F0] border border-[#0F8F6F]/30" />
            Con campaña
          </div>
          <div className="flex items-center gap-2 text-xs text-[#64716B] font-medium">
            <div className="w-3 h-3 rounded-md bg-[#0F8F6F]" />
            Hoy
          </div>
        </div>
      </div>
    </div>
  );
}
