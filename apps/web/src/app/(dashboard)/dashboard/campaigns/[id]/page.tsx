'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';

export default function CampaignDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [campaign, setCampaign] = useState<any>(null);
  const [failedRecipients, setFailedRecipients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [statsRes, recipientsRes] = await Promise.all([
        api.get(`/campaigns/${id}/stats`),
        api.get(`/campaigns/${id}/recipients?status=failed`),
      ]);
      setCampaign(statsRes.data);
      setFailedRecipients(recipientsRes.data || []);
    } catch (err: any) {
      setError('No se pudo cargar la información de la campaña');
    } finally {
      setLoading(false);
    }
  };

  const loadRecipients = async () => {
    try {
      const { data } = await api.get(`/campaigns/${id}/recipients?status=failed`);
      setFailedRecipients(data || []);
    } catch (err) {
      console.error('[CampaignDetailPage] Error al recargar destinatarios:', err);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleDeleteContact = async (contactId: string, recipientId: string) => {
    if (!contactId) return;
    if (!confirm('¿Eliminar este contacto de tu lista? El historial de esta campaña se conservará.')) {
      return;
    }

    setActionLoading(recipientId);
    try {
      await api.delete(`/contacts/${contactId}`);
      alert('1 contacto fue depurado.');
      await loadRecipients();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al depurar el contacto');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDepurateAll = async () => {
    const activeFailed = failedRecipients.filter((r) => !r.is_deleted && r.contact_id);
    if (activeFailed.length === 0) return;

    if (!confirm(`¿Eliminar los ${activeFailed.length} contactos fallidos de tu lista? El historial de la campaña se conservará.`)) {
      return;
    }

    setActionLoading('bulk');
    try {
      const { data } = await api.post(`/campaigns/${id}/depurate-failed`);
      const count = data?.depurated_count !== undefined ? data.depurated_count : activeFailed.length;
      alert(`${count} contactos fueron depurados.`);
      await loadRecipients();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al depurar los contactos');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="p-8 text-wavo-muted">Cargando detalles de campaña...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;

  const stats = campaign?.stats || { pending: 0, sent: 0, delivered: 0, read: 0, failed: 0 };
  const activeFailedCount = failedRecipients.filter((r) => !r.is_deleted && r.contact_id).length;

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

      {failedRecipients.length > 0 && (
        <div className="card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E4ECE7] pb-4">
            <div>
              <h2 className="text-xs font-semibold text-[#17201C] uppercase tracking-wider">
                Contactos con envío fallido ({failedRecipients.length})
              </h2>
              <p className="text-xs text-[#64716B] mt-0.5 font-medium">
                Destinatarios cuyo mensaje no pudo ser entregado por WhatsApp / Meta
              </p>
            </div>
            {activeFailedCount > 0 && (
              <button
                type="button"
                onClick={handleDepurateAll}
                disabled={actionLoading !== null}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {actionLoading === 'bulk' ? 'Depurando...' : `Depurar todos los contactos fallidos (${activeFailedCount})`}
              </button>
            )}
          </div>

          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E4ECE7] text-[#64716B] bg-[#F7FAF8]">
                  <th className="py-2.5 px-3 font-semibold">Nombre</th>
                  <th className="py-2.5 px-3 font-semibold">Teléfono</th>
                  <th className="py-2.5 px-3 font-semibold">Error de Meta</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Estado</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4ECE7]">
                {failedRecipients.map((recipient: any) => {
                  const contact = recipient.contact;
                  const isDeleted = recipient.is_deleted;
                  const phoneDisplay = contact?.phone || contact?.phone_normalized || '-';
                  const nameDisplay = contact?.name || 'Sin nombre';
                  const isOperating = actionLoading === recipient.id;

                  return (
                    <tr key={recipient.id} className="hover:bg-[#F7FAF8]/60 transition-colors">
                      <td className="py-3 px-3 font-medium text-[#17201C]">
                        {nameDisplay}
                      </td>
                      <td className="py-3 px-3 text-[#64716B] font-mono">
                        {phoneDisplay}
                      </td>
                      <td className="py-3 px-3 text-red-600 max-w-xs truncate font-mono text-[11px]" title={recipient.error_message}>
                        {recipient.error_message || 'Error desconocido'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isDeleted ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600">
                            Depurado
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">
                            Fallido
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {isDeleted ? (
                          <span className="text-[11px] text-[#64716B] font-medium italic">
                            Depurado
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDeleteContact(recipient.contact_id, recipient.id)}
                            disabled={actionLoading !== null || !recipient.contact_id}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded bg-white text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            {isOperating ? 'Eliminando...' : 'Eliminar contacto'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
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
