'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Stats {
  sent_today: number;
  delivery_rate: number;
  open_rate: number;
  optouts_week: number;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  sent_count: number;
  total_recipients: number;
  scheduled_at: string;
}

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    running: 'badge-green',
    completed: 'badge-blue',
    scheduled: 'badge-amber',
    failed: 'badge-red',
    draft: 'badge-amber',
  };
  const labels: Record<string, string> = {
    running: 'Activa', completed: 'Completa',
    scheduled: 'Programada', failed: 'Fallida', draft: 'Borrador',
  };
  return <span className={map[s] || 'badge-amber'}>{labels[s] || s}</span>;
};

export default function DashboardPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/campaigns').then(({ data }) => {
      setCampaigns(data.slice(0, 5));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: es });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-medium text-wavo-text">Panel general</h1>
          <p className="text-sm text-wavo-muted capitalize">{today}</p>
        </div>
        <a href="/dashboard/campaigns/new" className="btn-primary">
          + Nueva campaña
        </a>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Enviados hoy', value: '—', sub: 'conecta Meta API' },
          { label: 'Tasa de entrega', value: '—%', sub: 'sin datos aún' },
          { label: 'Tasa de apertura', value: '—%', sub: 'sin datos aún' },
          { label: 'Opt-outs', value: '—', sub: 'esta semana' },
        ].map((m) => (
          <div key={m.label} className="metric-card">
            <p className="text-xs text-wavo-muted mb-1">{m.label}</p>
            <p className="text-2xl font-medium text-wavo-text">{m.value}</p>
            <p className="text-xs text-wavo-muted mt-1">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Campañas recientes */}
      <div className="card">
        <h2 className="text-sm font-medium text-wavo-text mb-4">Campañas recientes</h2>
        {loading ? (
          <p className="text-sm text-wavo-muted">Cargando...</p>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-wavo-muted mb-3">No hay campañas todavía</p>
            <a href="/dashboard/campaigns/new" className="btn-primary text-sm">
              Crear primera campaña
            </a>
          </div>
        ) : (
          <div className="divide-y divide-wavo-border">
            {campaigns.map((c) => (
              <div key={c.id} className="flex items-center gap-3 py-3">
                <div className="w-9 h-9 rounded-md bg-wavo-sidebar border border-wavo-border flex items-center justify-center shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#908c72" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M3 9h18M9 21V9"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-wavo-text truncate">{c.name}</p>
                  <div className="w-full bg-wavo-border rounded-full h-1 mt-1">
                    <div
                      className="bg-wavo-green h-1 rounded-full"
                      style={{ width: `${c.total_recipients > 0 ? (c.sent_count / c.total_recipients) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-wavo-muted mt-0.5">
                    {c.sent_count} / {c.total_recipients} enviados
                  </p>
                </div>
                {statusBadge(c.status)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
