'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [saving, setSaving] = useState(false);

  const load = () =>
    api.get('/contacts').then(({ data }) => {
      setContacts(data.data || []);
      setLoading(false);
    });

  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await api.post('/contacts', form);
    setForm({ name: '', phone: '' });
    setSaving(false);
    load();
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/contacts/${id}`);
    load();
  };

  const handleCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').slice(1);
    const contacts = lines
      .filter(Boolean)
      .map((l) => {
        const [name, phone] = l.split(',');
        return { name: name?.trim(), phone: phone?.trim() };
      })
      .filter((c) => c.name && c.phone);
    const { data } = await api.post('/contacts/import', { contacts });
    alert(`${data.imported} contactos importados`);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium text-wavo-text">Contactos</h1>
        <label className="btn-secondary cursor-pointer text-sm">
          Importar CSV
          <input type="file" accept=".csv" className="hidden" onChange={handleCSV} />
        </label>
      </div>

      {/* Agregar contacto */}
      <div className="card mb-4">
        <h2 className="text-sm font-medium text-wavo-text mb-3">Agregar contacto</h2>
        <form onSubmit={handleAdd} className="flex gap-3">
          <input
            className="input flex-1"
            placeholder="Nombre"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
          />
          <input
            className="input flex-1"
            placeholder="+57300..."
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            required
          />
          <button type="submit" className="btn-primary shrink-0" disabled={saving}>
            {saving ? '...' : 'Agregar'}
          </button>
        </form>
        <p className="text-xs text-wavo-muted mt-2">
          CSV formato: nombre,telefono (una fila por contacto, sin encabezado en primera fila o con)
        </p>
      </div>

      {/* Lista */}
      <div className="card">
        <p className="text-xs text-wavo-muted mb-3">{contacts.length} contactos activos</p>
        {loading ? (
          <p className="text-sm text-wavo-muted">Cargando...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-wavo-border">
                <th className="text-left py-2 px-2 text-xs font-medium text-wavo-muted uppercase tracking-wide">Nombre</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-wavo-muted uppercase tracking-wide">Teléfono</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-wavo-muted uppercase tracking-wide">Etiquetas</th>
                <th className="py-2 px-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-wavo-border">
              {contacts.map((c) => (
                <tr key={c.id} className="hover:bg-wavo-sidebar">
                  <td className="py-2 px-2 text-wavo-text">{c.name}</td>
                  <td className="py-2 px-2 text-wavo-muted font-mono text-xs">{c.phone}</td>
                  <td className="py-2 px-2">
                    {c.tags?.map((t: string) => (
                      <span key={t} className="badge-blue mr-1">{t}</span>
                    ))}
                  </td>
                  <td className="py-2 px-2 text-right">
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
