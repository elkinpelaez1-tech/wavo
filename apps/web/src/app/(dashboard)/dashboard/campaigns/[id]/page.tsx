'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';

export default function CampaignDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const { data } = await api.get(`/campaigns/${id}/stats`);
      setCampaign(data);
    } catch (err: any) {
      setError('No se pudo cargar la información de la campaña');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="p-8 text-wavo-muted">Cargando detalles de campaña...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;

  const stats = campaign.stats || { pending: 0, sent: 0, delivered: 0, read: 0, failed: 0 };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-2">
        <a href="/dashboard/campaigns" className="text-xs font-semibold text-[#0F8F6F] hover:underline flex items-center gap-1">
          ← Volver a Campañas
        </a>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-[#17201C] tracking-tight">{campaign.name}</h1>
        <p className="text-xs text-[#64716B] mt-1 font-medium">Resumen de entrega, métricas de apertura y estado del envío</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Destinatarios" value={campaign.total_recipients} />
        <StatCard label="Enviados" value={stats.sent} color="text-[#0F8F6F]" />
        <StatCard label="Entregados" value={stats.delivered} color="text-blue-600" />
        <StatCard label="Leídos" value={stats.read} color="text-purple-600" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 card space-y-3">
          <h2 className="text-xs font-semibold text-[#17201C] uppercase tracking-wider">Detalles del Envío</h2>
          <div className="space-y-1 divide-y divide-[#E4ECE7]">
            <InfoRow label="Estado" value={campaign.status?.toUpperCase()} />
            <InfoRow label="Plantilla" value={campaign.template_name || 'Sin asignar'} />
            <InfoRow label="Fecha de creación" value={new Date(campaign.created_at).toLocaleString('es-ES')} />
            {campaign.scheduled_at && (
              <InfoRow label="Programada para" value={new Date(campaign.scheduled_at).toLocaleString('es-ES')} />
            )}
          </div>
        </div>

        <div className="card text-center flex flex-col justify-center p-6">
          <h2 className="text-xs font-semibold text-[#17201C] uppercase tracking-wider mb-2">Mensajes Fallidos</h2>
          <p className="text-3xl font-bold text-red-500">{stats.failed}</p>
          <p className="text-xs text-[#64716B] mt-1">Rebotes o números no válidos</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color = 'text-[#17201C]' }: any) {
  return (
    <div className="metric-card text-center p-5">
      <p className="text-[11px] font-semibold text-[#64716B] uppercase tracking-wider mb-1.5">{label}</p>
      <p className={`text-2xl lg:text-3xl font-bold tracking-tight ${color}`}>{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: any) {
  return (
    <div className="flex justify-between py-2.5 text-xs">
      <span className="text-[#64716B] font-medium">{label}</span>
      <span className="text-[#17201C] font-semibold">{value}</span>
    </div>
  );
}
