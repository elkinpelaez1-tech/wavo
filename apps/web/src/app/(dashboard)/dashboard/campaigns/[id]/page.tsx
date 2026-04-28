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
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <a href="/dashboard/campaigns" className="text-wavo-muted hover:text-wavo-text text-sm">
          ← Campañas
        </a>
        <span className="text-wavo-border">/</span>
        <h1 className="text-lg font-medium text-wavo-text">{campaign.name}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total" value={campaign.total_recipients} />
        <StatCard label="Enviados" value={stats.sent} color="text-wavo-green" />
        <StatCard label="Entregados" value={stats.delivered} color="text-blue-500" />
        <StatCard label="Leídos" value={stats.read} color="text-purple-500" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 card">
          <h2 className="text-sm font-medium text-wavo-text mb-4">Información</h2>
          <div className="space-y-3">
            <InfoRow label="Estado" value={campaign.status.toUpperCase()} />
            <InfoRow label="Template" value={campaign.template_name || 'Sin asignar'} />
            <InfoRow label="Creada el" value={new Date(campaign.created_at).toLocaleString()} />
            {campaign.scheduled_at && (
              <InfoRow label="Programada para" value={new Date(campaign.scheduled_at).toLocaleString()} />
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="text-sm font-medium text-wavo-text mb-4">Fallas</h2>
          <div className="text-center py-6">
            <p className="text-2xl font-bold text-red-500">{stats.failed}</p>
            <p className="text-xs text-wavo-muted">Mensajes fallidos</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color = 'text-wavo-text' }: any) {
  return (
    <div className="card text-center p-6">
      <p className="text-xs text-wavo-muted uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: any) {
  return (
    <div className="flex justify-between border-b border-wavo-border py-2 text-sm">
      <span className="text-wavo-muted">{label}</span>
      <span className="text-wavo-text font-medium">{value}</span>
    </div>
  );
}
