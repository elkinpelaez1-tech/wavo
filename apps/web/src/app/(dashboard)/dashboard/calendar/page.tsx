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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium text-wavo-text">Calendario</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrent((d) => new Date(d.getFullYear(), d.getMonth() - 1))}
            className="btn-secondary px-3 py-1 text-sm"
          >
            ←
          </button>
          <span className="text-sm font-medium text-wavo-text capitalize">
            {format(current, 'MMMM yyyy', { locale: es })}
          </span>
          <button
            onClick={() => setCurrent((d) => new Date(d.getFullYear(), d.getMonth() + 1))}
            className="btn-secondary px-3 py-1 text-sm"
          >
            →
          </button>
        </div>
      </div>

      <div className="card">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {dayNames.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-wavo-muted py-2">
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDow }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {days.map((day) => {
            const hasC = hasCampaign(day);
            const todayDay = isToday(day);
            const dayCampaigns = getCampaigns(day);

            return (
              <div
                key={day.toISOString()}
                className={`relative min-h-[56px] p-1 rounded-lg border transition-colors
                  ${todayDay ? 'bg-wavo-green border-wavo-green' : hasC ? 'bg-wavo-mist border-wavo-foam' : 'border-transparent hover:bg-wavo-sidebar'}`}
              >
                <span className={`text-xs font-medium ${todayDay ? 'text-white' : hasC ? 'text-wavo-deep' : 'text-wavo-muted'}`}>
                  {format(day, 'd')}
                </span>
                {dayCampaigns.slice(0, 2).map((c) => (
                  <div key={c.id} className="mt-0.5 text-xs truncate text-wavo-deep bg-white/60 rounded px-1">
                    {c.name}
                  </div>
                ))}
                {dayCampaigns.length > 2 && (
                  <div className="text-xs text-wavo-muted">+{dayCampaigns.length - 2}</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-4 pt-4 border-t border-wavo-border">
          <div className="flex items-center gap-2 text-xs text-wavo-muted">
            <div className="w-3 h-3 rounded-sm bg-wavo-mist border border-wavo-foam" />
            Con campaña
          </div>
          <div className="flex items-center gap-2 text-xs text-wavo-muted">
            <div className="w-3 h-3 rounded-sm bg-wavo-green" />
            Hoy
          </div>
        </div>
      </div>
    </div>
  );
}
