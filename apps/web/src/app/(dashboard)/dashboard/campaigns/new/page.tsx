'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function NewCampaignPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: '', template_name: '', image_url: '', scheduled_at: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/templates').then(({ data }) => setTemplates(data || []));
    api.get('/contacts?limit=200').then(({ data }) => setContacts(data.data || []));
  }, []);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const toggleContact = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const selectAll = () =>
    setSelected(selected.length === contacts.length ? [] : contacts.map((c) => c.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.template_name) { setError('Selecciona un template'); return; }
    if (selected.length === 0) { setError('Selecciona al menos un contacto'); return; }
    setSaving(true);
    try {
      await api.post('/campaigns', { ...form, contact_ids: selected });
      router.push('/dashboard/campaigns');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear');
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <a href="/dashboard/campaigns" className="text-wavo-muted hover:text-wavo-text text-sm">
          ← Campañas
        </a>
        <span className="text-wavo-border">/</span>
        <h1 className="text-lg font-medium text-wavo-text">Nueva campaña</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card space-y-4">
          <h2 className="text-sm font-medium text-wavo-text">Detalles</h2>
          <div>
            <label className="label">Nombre de la campaña</label>
            <input className="input" placeholder="Promo Mayo 2026" onChange={set('name')} required />
          </div>
          <div>
            <label className="label">Template HSM</label>
            <select className="input" onChange={set('template_name')} required>
              <option value="">— Seleccionar template —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.meta_template_name}>
                  {t.display_name} ({t.status})
                </option>
              ))}
            </select>
            {templates.length === 0 && (
              <p className="text-xs text-wavo-muted mt-1">
                <a href="/dashboard/templates" className="text-wavo-green hover:underline">
                  Sincroniza tus templates desde Meta →
                </a>
              </p>
            )}
          </div>
          <div>
            <label className="label">URL de imagen (opcional)</label>
            <input className="input" placeholder="https://..." onChange={set('image_url')} />
            <p className="text-xs text-wavo-muted mt-1">Imagen pública accesible por Meta</p>
          </div>
          <div>
            <label className="label">Programar envío (opcional)</label>
            <input type="datetime-local" className="input" onChange={set('scheduled_at')} />
            <p className="text-xs text-wavo-muted mt-1">Dejar vacío para guardar como borrador</p>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-wavo-text">
              Contactos ({selected.length} seleccionados)
            </h2>
            <button type="button" onClick={selectAll} className="text-xs text-wavo-green hover:underline">
              {selected.length === contacts.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-wavo-border">
            {contacts.length === 0 ? (
              <p className="text-sm text-wavo-muted py-4 text-center">
                <a href="/dashboard/contacts" className="text-wavo-green hover:underline">
                  Agrega contactos primero →
                </a>
              </p>
            ) : (
              contacts.map((c) => (
                <label key={c.id} className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-wavo-sidebar px-1 rounded">
                  <input
                    type="checkbox"
                    checked={selected.includes(c.id)}
                    onChange={() => toggleContact(c.id)}
                    className="accent-wavo-green"
                  />
                  <div>
                    <p className="text-sm text-wavo-text">{c.name}</p>
                    <p className="text-xs text-wavo-muted">{c.phone}</p>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-3">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Guardando...' : 'Crear campaña'}
          </button>
          <a href="/dashboard/campaigns" className="btn-secondary">Cancelar</a>
        </div>
      </form>
    </div>
  );
}
