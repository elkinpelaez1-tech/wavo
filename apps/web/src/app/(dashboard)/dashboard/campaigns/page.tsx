'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Campaign {
  id: string;
  name: string;
  status: string;
  sent_count: number;
  total_recipients: number;
  scheduled_at: string;
  created_at: string;
  template_name?: string;
}

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    running: 'badge-green', completed: 'badge-blue',
    scheduled: 'badge-amber', failed: 'badge-red', draft: 'badge-amber',
  };
  const labels: Record<string, string> = {
    running: 'Activa', completed: 'Completa',
    scheduled: 'Programada', failed: 'Fallida', draft: 'Borrador',
  };
  return <span className={map[s] || 'badge-amber'}>{labels[s] || s}</span>;
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    api.get('/campaigns').then(({ data }) => {
      setCampaigns(data);
      setLoading(false);
    });
  }, []);

  const launch = async (id: string) => {
    try {
      console.log(`[CampaignsPage] Lanzando campaña ID: ${id}`);
      const { data } = await api.post(`/campaigns/${id}/launch`);
      console.log("[CampaignsPage] Lanzamiento exitoso:", data);
      
      const { data: updated } = await api.get('/campaigns');
      setCampaigns(updated);
      alert('Campaña lanzada con éxito');
    } catch (err: any) {
      console.error("[CampaignsPage] Error al lanzar campaña:", err);
      const msg = err.response?.data?.message || err.message || 'Error al lanzar';
      if (msg.toLowerCase().includes('límite') || msg.toLowerCase().includes('plan free')) {
        setShowUpgrade(true);
      } else {
        alert(`Error al lanzar: ${msg}`);
      }
    }
  };


  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium text-wavo-text">Campañas</h1>
        <a href="/dashboard/campaigns/new" className="btn-primary">+ Nueva campaña</a>
      </div>

      <div className="card">
        {loading ? (
          <p className="text-sm text-wavo-muted p-4">Cargando...</p>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-wavo-muted mb-4">No hay campañas todavía</p>
            <a href="/dashboard/campaigns/new" className="btn-primary">Crear campaña</a>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-wavo-border">
                <th className="text-left py-3 px-2 text-xs font-medium text-wavo-muted uppercase tracking-wide">Campaña</th>
                <th className="text-left py-3 px-2 text-xs font-medium text-wavo-muted uppercase tracking-wide">Estado</th>
                <th className="text-left py-3 px-2 text-xs font-medium text-wavo-muted uppercase tracking-wide">Progreso</th>
                <th className="text-left py-3 px-2 text-xs font-medium text-wavo-muted uppercase tracking-wide">Programada</th>
                <th className="py-3 px-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-wavo-border">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-wavo-sidebar transition-colors">
                  <td className="py-3 px-2">
                    <p className="font-medium text-wavo-text">{c.name}</p>
                    <p className="text-xs text-wavo-muted">{c.template_name || 'Sin template'}</p>
                  </td>
                  <td className="py-3 px-2">{statusBadge(c.status)}</td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-wavo-border rounded-full h-1.5 w-24">
                        <div
                          className="bg-wavo-green h-1.5 rounded-full"
                          style={{ width: `${c.total_recipients > 0 ? (c.sent_count / c.total_recipients) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-wavo-muted whitespace-nowrap">
                        {c.sent_count}/{c.total_recipients}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-wavo-muted">
                    {c.scheduled_at ? new Date(c.scheduled_at).toLocaleDateString('es') : '—'}
                  </td>
                  <td className="py-3 px-2 text-right">
                    <div className="flex gap-2 justify-end">
                      {['draft', 'scheduled', 'failed'].includes(c.status) && (
                        <button onClick={() => launch(c.id)} className="btn-primary text-xs py-1 px-3">
                          Lanzar
                        </button>
                      )}

                      <a href={`/dashboard/campaigns/${c.id}`} className="btn-secondary text-xs py-1 px-3">
                        Ver
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de Upgrade */}
      {showUpgrade && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#FDF8E1] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🚀</span>
              </div>
              <h3 className="text-xl font-bold text-[#2c2a1e] mb-2">¡Límite de campañas!</h3>
              <p className="text-[#908c72] text-sm mb-6 leading-relaxed">
                Has alcanzado el límite de <span className="font-bold text-[#2c2a1e]">1 campaña activa</span> de tu plan <span className="font-bold text-wavo-green">FREE</span>. 
                Actualiza a <span className="font-bold text-[#2c2a1e]">PRO</span> para lanzar múltiples campañas simultáneas.
              </p>
              <div className="flex flex-col gap-3">
                <a 
                  href="/upgrade" 
                  className="bg-wavo-green hover:bg-[#0F6E56] text-white py-3 rounded-xl font-semibold transition-all shadow-lg shadow-wavo-green/20"
                >
                  Actualizar a PRO
                </a>
                <button 
                  onClick={() => setShowUpgrade(false)}
                  className="text-[#908c72] hover:text-[#2c2a1e] text-sm font-medium py-2"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
