'use client';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '@/lib/api';

export default function StatsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/campaigns').then(({ data }) => {
      setCampaigns(data?.filter((c: any) => c.status === 'completed') || []);
      setLoading(false);
    });
  }, []);

  const chartData = campaigns.slice(0, 6).map((c) => ({
    name: c.name.length > 14 ? c.name.slice(0, 14) + '…' : c.name,
    enviados: c.sent_count,
    entregados: c.delivered_count,
    leídos: c.read_count,
  }));

  const totals = campaigns.reduce(
    (acc, c) => ({
      sent: acc.sent + (c.sent_count || 0),
      delivered: acc.delivered + (c.delivered_count || 0),
      read: acc.read + (c.read_count || 0),
      failed: acc.failed + (c.failed_count || 0),
    }),
    { sent: 0, delivered: 0, read: 0, failed: 0 },
  );

  const pct = (n: number, d: number) =>
    d > 0 ? ((n / d) * 100).toFixed(1) + '%' : '—';

  return (
    <div>
      <h1 className="text-lg font-medium text-wavo-text mb-6">Estadísticas</h1>

      {/* Totales globales */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total enviados', value: totals.sent.toLocaleString() },
          { label: 'Tasa entrega', value: pct(totals.delivered, totals.sent) },
          { label: 'Tasa apertura', value: pct(totals.read, totals.delivered) },
          { label: 'Fallidos', value: totals.failed.toLocaleString() },
        ].map((m) => (
          <div key={m.label} className="metric-card">
            <p className="text-xs text-wavo-muted mb-1">{m.label}</p>
            <p className="text-2xl font-medium text-wavo-text">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Gráfica por campaña */}
      <div className="card mb-6">
        <h2 className="text-sm font-medium text-wavo-text mb-4">Rendimiento por campaña</h2>
        {loading ? (
          <p className="text-sm text-wavo-muted">Cargando...</p>
        ) : chartData.length === 0 ? (
          <p className="text-sm text-wavo-muted">No hay campañas completadas aún</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ left: -10 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#908c72' }} />
              <YAxis tick={{ fontSize: 11, fill: '#908c72' }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '0.5px solid #EDE8D0' }}
              />
              <Bar dataKey="enviados" fill="#5DCAA5" radius={[4, 4, 0, 0]} />
              <Bar dataKey="entregados" fill="#1D9E75" radius={[4, 4, 0, 0]} />
              <Bar dataKey="leídos" fill="#0F6E56" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
        <div className="flex gap-4 mt-3 text-xs text-wavo-muted">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-wavo-foam inline-block" />Enviados</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-wavo-green inline-block" />Entregados</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-wavo-deep inline-block" />Leídos</span>
        </div>
      </div>

      {/* Tabla detallada */}
      <div className="card">
        <h2 className="text-sm font-medium text-wavo-text mb-4">Detalle por campaña</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-wavo-border">
              {['Campaña','Enviados','Entregados','Leídos','% Entrega','% Apertura'].map((h) => (
                <th key={h} className="text-left py-2 px-2 text-xs font-medium text-wavo-muted uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-wavo-border">
            {campaigns.map((c) => (
              <tr key={c.id} className="hover:bg-wavo-sidebar">
                <td className="py-2 px-2 text-wavo-text font-medium">{c.name}</td>
                <td className="py-2 px-2 text-wavo-muted">{c.sent_count}</td>
                <td className="py-2 px-2 text-wavo-muted">{c.delivered_count}</td>
                <td className="py-2 px-2 text-wavo-muted">{c.read_count}</td>
                <td className="py-2 px-2 text-wavo-green font-medium">{pct(c.delivered_count, c.sent_count)}</td>
                <td className="py-2 px-2 text-wavo-green font-medium">{pct(c.read_count, c.delivered_count)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
