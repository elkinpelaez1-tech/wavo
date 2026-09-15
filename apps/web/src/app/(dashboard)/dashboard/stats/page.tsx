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
    enviados: Number(c.sent_count) || 0,
    entregados: Number(c.delivered_count) || 0,
    leídos: Number(c.read_count) || 0,
  }));

  const totals = campaigns.reduce(
    (acc, c) => ({
      sent: acc.sent + (Number(c.sent_count) || 0),
      delivered: acc.delivered + (Number(c.delivered_count) || 0),
      read: acc.read + (Number(c.read_count) || 0),
      failed: acc.failed + (Number(c.failed_count) || 0),
    }),
    { sent: 0, delivered: 0, read: 0, failed: 0 },
  );

  const pct = (n: number | undefined | null, d: number | undefined | null) => {
    const num = Number(n) || 0;
    const den = Number(d) || 0;
    return den > 0 ? ((num / den) * 100).toFixed(1) + '%' : '—';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#17201C] tracking-tight">Estadísticas</h1>
          <p className="text-xs text-[#64716B] mt-1 font-medium">Métricas de entrega y apertura en tiempo real</p>
        </div>
      </div>

      {/* Totales globales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total enviados', value: totals.sent.toLocaleString() },
          { label: 'Tasa de entrega', value: pct(totals.delivered, totals.sent) },
          { label: 'Tasa de apertura', value: pct(totals.read, totals.delivered) },
          { label: 'Mensajes fallidos', value: totals.failed.toLocaleString() },
        ].map((m) => (
          <div key={m.label} className="metric-card">
            <p className="text-[11px] font-semibold text-[#64716B] uppercase tracking-wider mb-2">{m.label}</p>
            <p className="text-2xl lg:text-3xl font-bold text-[#17201C] tracking-tight">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Gráfica por campaña */}
      <div className="card">
        <h2 className="text-xs font-semibold text-[#17201C] mb-4">Rendimiento por campaña</h2>
        {loading ? (
          <p className="text-xs text-[#64716B] py-8 text-center font-medium">Cargando datos...</p>
        ) : chartData.length === 0 ? (
          <p className="text-xs text-[#64716B] py-8 text-center font-medium">No hay campañas completadas aún</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ left: -10 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64716B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64716B' }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #E4ECE7', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
              />
              <Bar dataKey="enviados" fill="#129F78" radius={[4, 4, 0, 0]} />
              <Bar dataKey="entregados" fill="#0F8F6F" radius={[4, 4, 0, 0]} />
              <Bar dataKey="leídos" fill="#065F46" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
        <div className="flex gap-4 mt-4 pt-3 border-t border-[#E4ECE7] text-xs text-[#64716B] font-medium">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#129F78] inline-block" />Enviados</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#0F8F6F] inline-block" />Entregados</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#065F46] inline-block" />Leídos</span>
        </div>
      </div>

      {/* Tabla detallada */}
      <div className="card overflow-hidden">
        <h2 className="text-xs font-semibold text-[#17201C] mb-4">Detalle por campaña</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#E4ECE7]">
                {['Campaña','Enviados','Entregados','Leídos','% Entrega','% Apertura'].map((h) => (
                  <th key={h} className="text-left py-2.5 px-3 font-semibold text-[#64716B] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4ECE7]">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-[#F8FAF9] transition-colors">
                  <td className="py-3 px-3 text-[#17201C] font-semibold">{c.name}</td>
                  <td className="py-3 px-3 text-[#64716B]">{c.sent_count ?? 0}</td>
                  <td className="py-3 px-3 text-[#64716B]">{c.delivered_count ?? 0}</td>
                  <td className="py-3 px-3 text-[#64716B]">{c.read_count ?? 0}</td>
                  <td className="py-3 px-3 text-[#0F8F6F] font-semibold">{pct(c.delivered_count, c.sent_count)}</td>
                  <td className="py-3 px-3 text-[#065F46] font-semibold">{pct(c.read_count, c.delivered_count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
