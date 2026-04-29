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
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-medium text-wavo-text">Templates HSM</h1>
          <p className="text-sm text-wavo-muted">Templates aprobados por Meta para envío masivo</p>
        </div>
        <button onClick={sync} className="btn-primary" disabled={syncing}>
          {syncing ? 'Sincronizando...' : '↻ Sincronizar con Meta'}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-wavo-muted">Cargando...</p>
      ) : templates.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-sm text-wavo-muted mb-4">
            No hay templates. Crea templates en Meta Business Manager y sincronízalos aquí.
          </p>
          <button onClick={sync} className="btn-primary">Sincronizar desde Meta</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {templates.map((t) => (
            <div key={t.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium text-wavo-text text-sm">{t.display_name}</p>
                  <p className="text-xs text-wavo-muted font-mono">{t.meta_template_name}</p>
                </div>
                {statusBadge(t.status)}
              </div>
              <div className="flex gap-2 mb-3">
                <span className="badge-blue">{t.category}</span>
                <span className="badge-blue">{t.language}</span>
                {t.has_image && <span className="badge-amber">Con imagen</span>}
              </div>
              {t.body_text && (
                <p className="text-xs text-wavo-muted bg-wavo-sidebar rounded-md p-3 line-clamp-3">
                  {t.body_text}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
