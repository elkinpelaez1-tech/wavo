'use client';
import { useEffect, useState, useMemo } from 'react';
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
  tags?: string[];
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

  // Filtros de contactos
  const [contactSearch, setContactSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

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
    api.get('/contacts?limit=500').then(({ data }) => setContacts(data.data || []));
  }, []);

  // Extraer etiquetas únicas disponibles de los contactos cargados
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    contacts.forEach((c) => {
      if (Array.isArray(c.tags)) {
        c.tags.forEach((t) => {
          const trimmed = typeof t === 'string' ? t.trim() : '';
          if (trimmed) tagSet.add(trimmed);
        });
      }
    });
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  }, [contacts]);

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

  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      // 1. Filtro por etiqueta
      if (selectedTag) {
        if (!Array.isArray(c.tags) || !c.tags.some((t) => typeof t === 'string' && t.trim().toLowerCase() === selectedTag.trim().toLowerCase())) {
          return false;
        }
      }
      // 2. Filtro de búsqueda (nombre o teléfono)
      if (contactSearch.trim()) {
        const query = contactSearch.toLowerCase();
        const nameMatch = (c.name || '').toLowerCase().includes(query);
        const phoneMatch = (c.phone || '').includes(query);
        return nameMatch || phoneMatch;
      }
      return true;
    });
  }, [contacts, selectedTag, contactSearch]);

  // Determinar si todos los contactos filtrados actualmente están seleccionados
  const allFilteredSelected = filteredContacts.length > 0 && filteredContacts.every((c) => selected.includes(c.id));

  const selectAll = () => {
    if (filteredContacts.length === 0) return;
    if (allFilteredSelected) {
      const filteredIds = new Set(filteredContacts.map((c) => c.id));
      setSelected((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      const newSelected = new Set(selected);
      filteredContacts.forEach((c) => newSelected.add(c.id));
      setSelected(Array.from(newSelected));
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
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        <a href="/dashboard/campaigns" className="text-xs font-semibold text-[#0F8F6F] hover:underline flex items-center gap-1">
          ← Volver a Campañas
        </a>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-[#17201C] tracking-tight">Nueva Campaña</h1>
        <p className="text-xs text-[#64716B] mt-1 font-medium">Configura y programa un nuevo envío de mensajes masivos</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Paso 1: Tipo de Mensaje */}
        <div className="card space-y-4">
          <h2 className="text-xs font-semibold text-[#17201C] uppercase tracking-wider">1. Tipo de mensaje</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleMessageTypeChange('text')}
              className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                messageType === 'text'
                  ? 'border-[#0F8F6F] bg-[#E8F7F0] ring-1 ring-[#0F8F6F] shadow-2xs'
                  : 'border-[#E4ECE7] bg-[#F8FAF9] hover:border-[#0F8F6F]/60'
              }`}
            >
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="text-lg">📝</span>
                <span className="font-semibold text-sm text-[#17201C]">Solo texto</span>
              </div>
              <p className="text-xs text-[#64716B] leading-relaxed">
                Mensaje de WhatsApp en texto plano para avisos, ofertas e información directa.
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleMessageTypeChange('image')}
              className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                messageType === 'image'
                  ? 'border-[#0F8F6F] bg-[#E8F7F0] ring-1 ring-[#0F8F6F] shadow-2xs'
                  : 'border-[#E4ECE7] bg-[#F8FAF9] hover:border-[#0F8F6F]/60'
              }`}
            >
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="text-lg">🖼️</span>
                <span className="font-semibold text-sm text-[#17201C]">Imagen + texto</span>
              </div>
              <p className="text-xs text-[#64716B] leading-relaxed">
                Mensaje con banner o imagen destacada en el encabezado y texto promocional.
              </p>
            </button>
          </div>
        </div>

        {/* Paso 2: Detalles y Plantilla */}
        <div className="card space-y-4">
          <h2 className="text-xs font-semibold text-[#17201C] uppercase tracking-wider">2. Detalles y plantilla</h2>
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
              <span className="text-xs text-[#64716B] font-medium">
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
              <p className="text-xs text-amber-600 mt-2 font-medium">
                No tienes plantillas aprobadas de tipo <strong>{messageType === 'image' ? 'Imagen' : 'Texto'}</strong>.{' '}
                <a href="/dashboard/templates" className="text-[#0F8F6F] underline font-semibold">
                  Sincroniza tus plantillas desde Meta →
                </a>
              </p>
            )}

            {/* Vista previa del contenido de la plantilla */}
            {selectedTemplate && (
              <div className="mt-3 p-3.5 bg-[#F8FAF9] border border-[#E4ECE7] rounded-xl">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-[#17201C] uppercase tracking-wider">
                    Vista previa del mensaje
                  </span>
                  <span className="text-[10px] bg-[#E8F7F0] text-[#0F8F6F] border border-[#0F8F6F]/20 px-2 py-0.5 rounded-full font-bold">
                    Aprobada por Meta
                  </span>
                </div>
                <p className="text-xs text-[#17201C] leading-relaxed whitespace-pre-wrap">
                  {selectedTemplate.content ||
                    selectedTemplate.components?.find((c) => c.type?.toUpperCase() === 'BODY')?.text ||
                    'Contenido de la plantilla'}
                </p>
              </div>
            )}
          </div>

          {/* Imagen (Solo si el tipo es Imagen + Texto) */}
          {messageType === 'image' && (
            <div className="pt-2 border-t border-[#E4ECE7]">
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
                      ${preview ? 'border-[#0F8F6F] bg-[#F8FAF9]' : 'border-[#E4ECE7] hover:border-[#0F8F6F] bg-[#F8FAF9]'}
                      ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {preview ? (
                      <img src={preview} alt="Preview" className="h-full w-full object-contain rounded-lg p-1" />
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                        <svg className="w-8 h-8 mb-2 text-[#64716B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-xs font-semibold text-[#17201C]">Haz clic para seleccionar imagen</p>
                        <p className="text-[11px] text-[#64716B] mt-0.5">PNG, JPG o JPEG (Máx 5MB)</p>
                      </div>
                    )}
                    {uploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-xs rounded-xl">
                        <span className="text-xs font-semibold text-[#0F8F6F] animate-pulse">Subiendo imagen...</span>
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
                    className="text-xs text-red-600 hover:underline font-semibold"
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
            <div>
              <h2 className="text-xs font-semibold text-[#17201C] uppercase tracking-wider">
                3. Destinatarios ({selected.length} seleccionados)
              </h2>
              {selectedTag && (
                <p className="text-[11px] text-[#64716B] mt-0.5 font-medium">
                  Etiqueta: <span className="font-semibold text-[#0F8F6F]">{selectedTag}</span> • {filteredContacts.length} {filteredContacts.length === 1 ? 'contacto encontrado' : 'contactos encontrados'}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={selectAll}
              className="text-xs text-[#0F8F6F] hover:underline font-semibold"
              disabled={filteredContacts.length === 0}
            >
              {allFilteredSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
            </button>
          </div>

          {/* Filtros: Etiqueta y Búsqueda */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-[#64716B] uppercase tracking-wider block mb-1">
                Etiqueta
              </label>
              <select
                className="input text-xs py-2"
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
              >
                <option value="">Todas las etiquetas ({contacts.length})</option>
                {availableTags.map((tag) => {
                  const count = contacts.filter((c) => Array.isArray(c.tags) && c.tags.some(t => typeof t === 'string' && t.trim().toLowerCase() === tag.toLowerCase())).length;
                  return (
                    <option key={tag} value={tag}>
                      {tag} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#64716B] uppercase tracking-wider block mb-1">
                Búsqueda
              </label>
              <input
                type="text"
                className="input text-xs py-2"
                placeholder="🔍 Buscar por nombre o teléfono..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-[#E4ECE7] pr-1">
            {contacts.length === 0 ? (
              <p className="text-sm text-[#64716B] py-4 text-center">
                <a href="/dashboard/contacts" className="text-[#0F8F6F] hover:underline font-semibold">
                  Agrega contactos primero →
                </a>
              </p>
            ) : filteredContacts.length === 0 ? (
              <p className="text-xs text-[#64716B] py-4 text-center font-medium">
                {selectedTag
                  ? `No se encontraron contactos con la etiqueta "${selectedTag}"${contactSearch ? ` que coincidan con "${contactSearch}"` : ''}`
                  : `No se encontraron contactos para "${contactSearch}"`}
              </p>
            ) : (
              filteredContacts.map((c) => (
                <label key={c.id} className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-[#F8FAF9] px-2 rounded-lg transition-colors">
                  <input
                    type="checkbox"
                    checked={selected.includes(c.id)}
                    onChange={() => toggleContact(c.id)}
                    className="accent-[#0F8F6F] h-4 w-4 rounded"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[#17201C] truncate">{c.name}</p>
                      {c.tags && c.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 shrink-0">
                          {c.tags.map((t) => (
                            <span
                              key={t}
                              className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                selectedTag && t.trim().toLowerCase() === selectedTag.trim().toLowerCase()
                                  ? 'bg-[#E8F7F0] text-[#0F8F6F] border border-[#0F8F6F]/30 font-semibold'
                                  : 'bg-[#F8FAF9] text-[#64716B] border border-[#E4ECE7]'
                              }`}
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-[#64716B] font-mono">{c.phone}</p>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Paso 4: Opciones de Envío */}
        <div className="card space-y-4">
          <h2 className="text-xs font-semibold text-[#17201C] uppercase tracking-wider">4. Momento del envío</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSendMode('now')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                sendMode === 'now'
                  ? 'border-[#0F8F6F] bg-[#E8F7F0] ring-1 ring-[#0F8F6F] shadow-2xs'
                  : 'border-[#E4ECE7] bg-[#F8FAF9] hover:border-[#0F8F6F]/60'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">⚡</span>
                <span className="font-semibold text-xs text-[#17201C]">Enviar ahora</span>
              </div>
              <p className="text-[11px] text-[#64716B] leading-normal">
                Lanza y entrega los mensajes inmediatamente a los contactos seleccionados.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setSendMode('schedule')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                sendMode === 'schedule'
                  ? 'border-[#0F8F6F] bg-[#E8F7F0] ring-1 ring-[#0F8F6F] shadow-2xs'
                  : 'border-[#E4ECE7] bg-[#F8FAF9] hover:border-[#0F8F6F]/60'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">⏰</span>
                <span className="font-semibold text-xs text-[#17201C]">Programar envío</span>
              </div>
              <p className="text-[11px] text-[#64716B] leading-normal">
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
            className="btn-primary shadow-2xs"
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
          <a href="/dashboard/campaigns" className="btn-secondary shadow-2xs">
            Cancelar
          </a>
        </div>
      </form>
    </div>
  );
}
