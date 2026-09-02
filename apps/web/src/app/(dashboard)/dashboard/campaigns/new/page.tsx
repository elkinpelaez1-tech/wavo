'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { getSupabase } from '@/lib/supabase';

interface TemplateComponent {
  type: string;
  format?: string;
  text?: string;
}

interface Template {
  id: string;
  meta_template_name: string;
  display_name: string;
  language: string;
  status: string;
  content: string;
  components?: TemplateComponent[];
}

interface Contact {
  id: string;
  name: string;
  phone: string;
}

export default function NewCampaignPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  
  // Tipo de mensaje: 'text' | 'image'
  const [messageType, setMessageType] = useState<'text' | 'image'>('text');

  // Modo de envío: 'now' | 'schedule'
  const [sendMode, setSendMode] = useState<'now' | 'schedule'>('now');

  // Filtro de búsqueda para contactos
  const [contactSearch, setContactSearch] = useState('');

  const [form, setForm] = useState({
    name: '',
    template_name: '',
    image_url: '',
    scheduled_at: '',
  });

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState('');

  useEffect(() => {
    api.get('/templates').then(({ data }) => setTemplates(data || []));
    api.get('/contacts?limit=200').then(({ data }) => setContacts(data.data || []));
  }, []);

  const hasImageHeader = (t: Template) => {
    return Array.isArray(t?.components) && t.components.some(
      (c) => c.type?.toUpperCase() === 'HEADER' && c.format?.toUpperCase() === 'IMAGE'
    );
  };

  // Filtrar plantillas según el tipo de mensaje seleccionado
  const filteredTemplates = templates.filter((t) => {
    if (t.status && t.status.toLowerCase() !== 'approved') return false;
    const hasImg = hasImageHeader(t);
    return messageType === 'image' ? hasImg : !hasImg;
  });

  // Plantilla actualmente seleccionada para vista previa
  const selectedTemplate = templates.find((t) => t.meta_template_name === form.template_name);

  const handleMessageTypeChange = (type: 'text' | 'image') => {
    setMessageType(type);
    // Si la plantilla seleccionada actual no es compatible con el nuevo tipo, resetearla
    if (form.template_name) {
      const currentT = templates.find((t) => t.meta_template_name === form.template_name);
      if (currentT) {
        const isImg = hasImageHeader(currentT);
        if ((type === 'image' && !isImg) || (type === 'text' && isImg)) {
          setForm((prev) => ({ ...prev, template_name: '' }));
        }
      }
    }
    // Si se cambia a solo texto, limpiar imagen
    if (type === 'text') {
      setPreview('');
      setForm((prev) => ({ ...prev, image_url: '' }));
    }
    setError('');
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [k]: e.target.value }));
    setError('');
  };

  const toggleContact = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const filteredContacts = contacts.filter((c) => {
    const query = contactSearch.toLowerCase();
    const nameMatch = (c.name || '').toLowerCase().includes(query);
    const phoneMatch = (c.phone || '').includes(query);
    return nameMatch || phoneMatch;
  });

  const selectAll = () => {
    if (selected.length === contacts.length) {
      setSelected([]);
    } else {
      setSelected(contacts.map((c) => c.id));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
      const { data, error: uploadError } = await supabase.storage
        .from('campaign-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('campaign-images')
        .getPublicUrl(filePath);

      setForm((prev) => ({ ...prev, image_url: publicUrl }));
    } catch (err: any) {
      console.error('Error al subir imagen:', err);
      setError(`Error al subir imagen: ${err.message || 'Error desconocido'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      setError('Ingresa un nombre para la campaña');
      return;
    }

    if (!form.template_name) {
      setError('Debes seleccionar una plantilla para el envío');
      return;
    }

    if (messageType === 'image' && !form.image_url) {
      setError('Debes subir una imagen para la plantilla multimedia');
      return;
    }

    if (sendMode === 'schedule' && !form.scheduled_at) {
      setError('Debes especificar la fecha y hora para programar el envío');
      return;
    }

    if (selected.length === 0) {
      setError('Selecciona al menos un contacto destinatario');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        name: form.name.trim(),
        template_name: form.template_name,
        contact_ids: selected,
      };

      if (messageType === 'image' && form.image_url) {
        payload.image_url = form.image_url;
      }

      if (sendMode === 'schedule' && form.scheduled_at) {
        payload.scheduled_at = new Date(form.scheduled_at).toISOString();
      }

      // 1. Crear campaña
      const { data: createdCampaign } = await api.post('/campaigns', payload);

      // 2. Si el usuario seleccionó "Enviar ahora", lanzar inmediatamente
      if (sendMode === 'now' && createdCampaign?.id) {
        await api.post(`/campaigns/${createdCampaign.id}/launch`);
      }

      router.push('/dashboard/campaigns');
    } catch (err: any) {
      console.error('Error en creación/lanzamiento:', err);
      setError(err.response?.data?.message || err.message || 'Error al procesar la campaña');
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
        {/* Paso 1: Tipo de Mensaje */}
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-wavo-text">1. Tipo de mensaje</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleMessageTypeChange('text')}
              className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                messageType === 'text'
                  ? 'border-wavo-green bg-[#E1F5EE]/40 ring-1 ring-wavo-green shadow-sm'
                  : 'border-wavo-border bg-wavo-sand hover:border-wavo-green/60'
              }`}
            >
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="text-lg">📝</span>
                <span className="font-semibold text-sm text-wavo-text">Solo texto</span>
              </div>
              <p className="text-xs text-wavo-muted leading-relaxed">
                Mensaje de WhatsApp en texto plano para avisos, ofertas e información directa.
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleMessageTypeChange('image')}
              className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                messageType === 'image'
                  ? 'border-wavo-green bg-[#E1F5EE]/40 ring-1 ring-wavo-green shadow-sm'
                  : 'border-wavo-border bg-wavo-sand hover:border-wavo-green/60'
              }`}
            >
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="text-lg">🖼️</span>
                <span className="font-semibold text-sm text-wavo-text">Imagen + texto</span>
              </div>
              <p className="text-xs text-wavo-muted leading-relaxed">
                Mensaje con banner o imagen destacada en el encabezado y texto promocional.
              </p>
            </button>
          </div>
        </div>

        {/* Paso 2: Detalles y Plantilla */}
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-wavo-text">2. Detalles y plantilla</h2>
          <div>
            <label className="label">Nombre de la campaña</label>
            <input
              className="input"
              placeholder="Ej: Promo Vacaciones 2026"
              value={form.name}
              onChange={set('name')}
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Plantilla de WhatsApp</label>
              <span className="text-xs text-wavo-muted">
                {filteredTemplates.length} {filteredTemplates.length === 1 ? 'disponible' : 'disponibles'}
              </span>
            </div>
            
            <select
              className="input"
              value={form.template_name}
              onChange={set('template_name')}
              required
            >
              <option value="">— Seleccionar plantilla —</option>
              {filteredTemplates.map((t) => (
                <option key={t.id} value={t.meta_template_name}>
                  {t.display_name || t.meta_template_name}
                </option>
              ))}
            </select>

            {filteredTemplates.length === 0 && (
              <p className="text-xs text-amber-600 mt-2">
                No tienes plantillas aprobadas de tipo <strong>{messageType === 'image' ? 'Imagen' : 'Texto'}</strong>.{' '}
                <a href="/dashboard/templates" className="text-wavo-green underline">
                  Sincroniza tus plantillas desde Meta →
                </a>
              </p>
            )}

            {/* Vista previa del contenido de la plantilla */}
            {selectedTemplate && (
              <div className="mt-3 p-3 bg-wavo-sand border border-wavo-border rounded-xl">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-wavo-text uppercase tracking-wider">
                    Vista previa del mensaje
                  </span>
                  <span className="text-[10px] bg-wavo-green/10 text-wavo-green px-2 py-0.5 rounded-full font-medium">
                    Aprobada
                  </span>
                </div>
                <p className="text-xs text-wavo-text leading-relaxed whitespace-pre-wrap">
                  {selectedTemplate.content ||
                    selectedTemplate.components?.find((c) => c.type?.toUpperCase() === 'BODY')?.text ||
                    'Contenido de la plantilla'}
                </p>
              </div>
            )}
          </div>

          {/* Imagen (Solo si el tipo es Imagen + Texto) */}
          {messageType === 'image' && (
            <div className="pt-2 border-t border-wavo-border/60">
              <label className="label">Imagen para el encabezado</label>
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
                    className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-all
                      ${preview ? 'border-wavo-green bg-wavo-sand' : 'border-wavo-border hover:border-wavo-green bg-wavo-sand'}
                      ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {preview ? (
                      <img src={preview} alt="Preview" className="h-full w-full object-contain rounded-lg p-1" />
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                        <svg className="w-8 h-8 mb-2 text-wavo-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-xs font-medium text-wavo-text">Haz clic para seleccionar imagen</p>
                        <p className="text-[11px] text-wavo-muted mt-0.5">PNG, JPG o JPEG</p>
                      </div>
                    )}
                    {uploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-xs rounded-xl">
                        <span className="text-xs font-semibold text-wavo-green animate-pulse">Subiendo imagen...</span>
                      </div>
                    )}
                  </label>
                </div>
                {preview && !uploading && (
                  <button
                    type="button"
                    onClick={() => {
                      setPreview('');
                      setForm((prev) => ({ ...prev, image_url: '' }));
                    }}
                    className="text-xs text-red-600 hover:underline font-medium"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Paso 3: Destinatarios */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-wavo-text">
              3. Destinatarios ({selected.length} seleccionados)
            </h2>
            <button type="button" onClick={selectAll} className="text-xs text-wavo-green hover:underline font-medium">
              {selected.length === contacts.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
            </button>
          </div>

          {/* Buscador de contactos */}
          <div>
            <input
              type="text"
              className="input text-xs py-2"
              placeholder="🔍 Buscar contacto por nombre o teléfono..."
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
            />
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-wavo-border pr-1">
            {contacts.length === 0 ? (
              <p className="text-sm text-wavo-muted py-4 text-center">
                <a href="/dashboard/contacts" className="text-wavo-green hover:underline font-medium">
                  Agrega contactos primero →
                </a>
              </p>
            ) : filteredContacts.length === 0 ? (
              <p className="text-xs text-wavo-muted py-4 text-center">
                No se encontraron contactos para &quot;{contactSearch}&quot;
              </p>
            ) : (
              filteredContacts.map((c) => (
                <label key={c.id} className="flex items-center gap-3 py-2 cursor-pointer hover:bg-wavo-sidebar/20 px-1 rounded transition-colors">
                  <input
                    type="checkbox"
                    checked={selected.includes(c.id)}
                    onChange={() => toggleContact(c.id)}
                    className="accent-wavo-green h-4 w-4 rounded"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-wavo-text truncate">{c.name}</p>
                    <p className="text-xs text-wavo-muted">{c.phone}</p>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Paso 4: Opciones de Envío */}
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-wavo-text">4. Momento del envío</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSendMode('now')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                sendMode === 'now'
                  ? 'border-wavo-green bg-[#E1F5EE]/40 ring-1 ring-wavo-green shadow-sm'
                  : 'border-wavo-border bg-wavo-sand hover:border-wavo-green/60'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">⚡</span>
                <span className="font-semibold text-xs text-wavo-text">Enviar ahora</span>
              </div>
              <p className="text-[11px] text-wavo-muted leading-normal">
                Lanza y entrega los mensajes inmediatamente a los contactos seleccionados.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setSendMode('schedule')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                sendMode === 'schedule'
                  ? 'border-wavo-green bg-[#E1F5EE]/40 ring-1 ring-wavo-green shadow-sm'
                  : 'border-wavo-border bg-wavo-sand hover:border-wavo-green/60'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">⏰</span>
                <span className="font-semibold text-xs text-wavo-text">Programar envío</span>
              </div>
              <p className="text-[11px] text-wavo-muted leading-normal">
                Elige una fecha y hora futura para que el sistema realice el envío automático.
              </p>
            </button>
          </div>

          {sendMode === 'schedule' && (
            <div className="pt-2">
              <label className="label">Fecha y hora de envío</label>
              <input
                type="datetime-local"
                className="input"
                value={form.scheduled_at}
                onChange={set('scheduled_at')}
                required={sendMode === 'schedule'}
              />
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="btn-primary"
            disabled={saving || uploading}
          >
            {saving
              ? sendMode === 'now'
                ? 'Lanzando campaña...'
                : 'Guardando campaña...'
              : sendMode === 'now'
              ? 'Lanzar campaña ahora'
              : 'Programar campaña'}
          </button>
          <a href="/dashboard/campaigns" className="btn-secondary">
            Cancelar
          </a>
        </div>
      </form>
    </div>
  );
}
