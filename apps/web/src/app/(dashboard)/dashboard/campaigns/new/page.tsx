'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { getSupabase } from '@/lib/supabase';



export default function NewCampaignPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: '', template_name: '', image_url: '', scheduled_at: '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState('');


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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview local
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    setError('');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `campaigns/${fileName}`;

      const supabase = getSupabase();
      console.log('Iniciando subida a bucket "campaign-images"...');
      const { data, error: uploadError } = await supabase.storage
        .from('campaign-images')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Error detallado de Supabase:', uploadError);
        throw uploadError;
      }

      console.log('Subida exitosa:', data);

      const { data: { publicUrl } } = supabase.storage
        .from('campaign-images')
        .getPublicUrl(filePath);

      setForm(prev => ({ ...prev, image_url: publicUrl }));
    } catch (err: any) {
      console.error('Error completo atrapado:', err);
      setError(`Error de Supabase: ${err.message || JSON.stringify(err)}`);
    } finally {
      setUploading(false);
    }

  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
            <label className="label">Template HSM (Opcional para MVP)</label>
            <select className="input" onChange={set('template_name')}>

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
            {!form.template_name && (
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                La campaña se guardará como borrador. Necesitarás un template para enviarla.
              </p>
            )}
          </div>

          <div>
            <label className="label">Imagen de la campaña (opcional)</label>
            <div className="mt-1 flex items-center gap-4">
              <div className="relative group flex-1">
                <input 
                  type="file" 
                  accept="image/*"
                  className="hidden" 
                  id="image-upload"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                <label 
                  htmlFor="image-upload"
                  className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all
                    ${preview ? 'border-wavo-green bg-wavo-sidebar' : 'border-wavo-border hover:border-wavo-green bg-wavo-sand'}
                    ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {preview ? (
                    <img src={preview} alt="Preview" className="h-full w-full object-contain rounded-lg" />
                  ) : (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg className="w-8 h-8 mb-3 text-wavo-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-xs text-wavo-muted">Click para subir imagen</p>
                    </div>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-xl">
                      <span className="text-xs font-medium text-wavo-green">Subiendo...</span>
                    </div>
                  )}
                </label>
              </div>
              {preview && !uploading && (
                <button 
                  type="button" 
                  onClick={() => { setPreview(''); setForm(prev => ({ ...prev, image_url: '' })); }}
                  className="text-xs text-red-500 hover:underline"
                >
                  Eliminar
                </button>
              )}
            </div>
            <p className="text-xs text-wavo-muted mt-2">La imagen debe ser pública para que Meta pueda enviarla.</p>
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
