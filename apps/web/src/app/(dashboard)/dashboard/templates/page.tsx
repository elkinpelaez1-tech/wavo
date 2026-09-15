'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = () =>
    api.get('/templates').then(({ data }) => {
      setTemplates(data || []);
      setLoading(false);
    });

  useEffect(() => { load(); }, []);

  const sync = async () => {
    setSyncing(true);
    try {
      const { data } = await api.get('/templates/sync');
      alert(`${data.synced} templates sincronizados`);
      load();
    } catch (err: any) {
      console.error("[TemplatesPage] Error syncing:", err);
      const msg = err.response?.data?.error?.message || err.response?.data?.message || err.message;
      alert(`Error al sincronizar: ${msg}`);
    } finally {
      setSyncing(false);
    }
  };

  const statusBadge = (s: string) => {
    if (s === 'approved') return <span className="badge-green">Aprobado</span>;
    if (s === 'rejected') return <span className="badge-red">Rechazado</span>;
    return <span className="badge-amber">Pendiente</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#17201C] tracking-tight">Plantillas HSM</h1>
          <p className="text-xs text-[#64716B] mt-1 font-medium">Plantillas oficiales aprobadas por Meta para envío masivo</p>
        </div>
        <button onClick={sync} className="btn-primary flex items-center gap-1.5" disabled={syncing}>
          <span className={syncing ? 'animate-spin' : ''}>↻</span>
          <span>{syncing ? 'Sincronizando...' : 'Sincronizar con Meta'}</span>
        </button>
      </div>

      {loading ? (
        <div className="card p-8 text-center">
          <p className="text-xs text-[#64716B] font-medium">Cargando plantillas...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="card text-center py-12">
          <div className="w-12 h-12 bg-[#E8F7F0] text-[#0F8F6F] rounded-2xl flex items-center justify-center mx-auto mb-3 text-xl">
            📋
          </div>
          <p className="text-sm text-[#17201C] font-semibold mb-1">No hay plantillas sincronizadas</p>
          <p className="text-xs text-[#64716B] max-w-sm mx-auto mb-4">
            Crea o aprueba plantillas en Meta Business Manager y sincronízalas directamente en Wavo.
          </p>
          <button onClick={sync} className="btn-primary text-xs py-2 px-4" disabled={syncing}>
            {syncing ? 'Sincronizando...' : 'Sincronizar desde Meta'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((t) => (
            <div key={t.id} className="card space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-[#17201C] text-sm">{t.display_name}</p>
                  <p className="text-[11px] text-[#64716B] font-mono mt-0.5">{t.meta_template_name}</p>
                </div>
                {statusBadge(t.status)}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="bg-[#E8F7F0] text-[#0F8F6F] border border-[#0F8F6F]/20 text-[11px] px-2 py-0.5 rounded-md font-medium">
                  {t.category}
                </span>
                <span className="bg-[#F8FAF9] text-[#64716B] border border-[#E4ECE7] text-[11px] px-2 py-0.5 rounded-md font-medium uppercase">
                  {t.language}
                </span>
                {t.has_image && (
                  <span className="badge-amber text-[11px] px-2 py-0.5">
                    🖼️ Con imagen
                  </span>
                )}
              </div>
              {t.body_text && (
                <div className="bg-[#F8FAF9] border border-[#E4ECE7] rounded-xl p-3 text-xs text-[#17201C] leading-relaxed line-clamp-4 whitespace-pre-wrap">
                  {t.body_text}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
