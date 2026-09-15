'use client';
import { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', tags: '' });
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/contacts?limit=1000').then(({ data }) => {
      const list = data.data || [];
      setContacts(list);
      setTotalCount(data.total !== undefined ? data.total : list.length);
      setLoading(false);
    }).catch((err) => {
      console.error("[ContactsPage] Error al cargar contactos:", err);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const q = searchQuery.toLowerCase().trim();
    return contacts.filter((c) => {
      const nameMatch = (c.name || '').toLowerCase().includes(q);
      const phoneMatch = (c.phone || '').includes(q) || (c.phone_normalized || '').includes(q);
      const tagsMatch = Array.isArray(c.tags) && c.tags.some((t: string) => (t || '').toLowerCase().includes(q));
      return nameMatch || phoneMatch || tagsMatch;
    });
  }, [contacts, searchQuery]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean)
      };
      console.log("[ContactsPage] Enviando contacto:", payload);
      const { data } = await api.post('/contacts', payload);
      console.log("[ContactsPage] Respuesta exitosa:", data);
      setForm({ name: '', phone: '', tags: '' });
      load();

    } catch (err: any) {
      console.error("[ContactsPage] Error al guardar:", err);
      const msg = err.response?.data?.message || err.message || 'Error desconocido';
      if (msg.toLowerCase().includes('límite') || msg.toLowerCase().includes('plan free')) {
        setShowUpgrade(true);
      } else {
        alert(`Error al guardar contacto: ${msg}`);
      }
    } finally {
      setSaving(false);
    }

  };


  const handleDelete = async (id: string) => {
    await api.delete(`/contacts/${id}`);
    load();
  };

  const handleCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Reset file input so re-selecting same file triggers onChange
    e.target.value = '';

    const text = await file.text();
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line !== '');
    if (lines.length === 0) return;

    // Detectar delimitador (el que más aparezca en la primera línea)
    const firstLine = lines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semiCount = (firstLine.match(/;/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;

    let delimiter = ',';
    if (semiCount >= commaCount && semiCount >= tabCount && semiCount > 0) {
      delimiter = ';';
    } else if (tabCount >= commaCount && tabCount >= semiCount && tabCount > 0) {
      delimiter = '\t';
    }

    const parseLine = (line: string) => {
      return line.split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ''));
    };

    const firstRowValues = parseLine(firstLine);
    const firstRowLower = firstRowValues.map(c => c.toLowerCase());

    // Detectar si la primera fila contiene palabras clave de encabezado
    const hasHeaderName = firstRowLower.some(c => c.includes('name') || c.includes('nombre') || c.includes('contacto'));
    const hasHeaderPhone = firstRowLower.some(c => c.includes('phone') || c.includes('telefono') || c.includes('teléfono') || c.includes('celular') || c.includes('movil') || c.includes('móvil'));

    const hasHeader = hasHeaderName || hasHeaderPhone;

    let nameIdx = 0;
    let phoneIdx = 1;
    let tagIdx = firstRowValues.length > 2 ? 2 : -1;
    let dataLines = lines;

    if (hasHeader) {
      // Mapeo por nombre de columna
      const detectedNameIdx = firstRowLower.findIndex(c => c.includes('name') || c.includes('nombre') || c.includes('contacto'));
      const detectedPhoneIdx = firstRowLower.findIndex(c => c.includes('phone') || c.includes('telefono') || c.includes('teléfono') || c.includes('celular') || c.includes('movil') || c.includes('móvil'));
      const detectedTagIdx = firstRowLower.findIndex(c => c.includes('tag') || c.includes('etiqueta') || c.includes('categoria') || c.includes('categoría'));

      if (detectedNameIdx !== -1) nameIdx = detectedNameIdx;
      if (detectedPhoneIdx !== -1) phoneIdx = detectedPhoneIdx;
      if (detectedTagIdx !== -1) tagIdx = detectedTagIdx;

      // Descartar la fila de encabezado
      dataLines = lines.slice(1);
    }

    const parsedContacts = dataLines.map(line => {
      const values = parseLine(line);
      const name = values[nameIdx] || '';
      const phone = values[phoneIdx] || '';
      const tagsValue = tagIdx !== -1 && values[tagIdx] ? values[tagIdx] : '';
      
      return {
        name,
        phone,
        tags: tagsValue ? tagsValue.split(/[|,-]/).map(t => t.trim()).filter(Boolean) : []
      };
    }).filter(c => c.name && c.phone);

    if (parsedContacts.length === 0) {
      alert('No se encontraron contactos válidos en el archivo CSV. Verifica el formato.');
      return;
    }

    try {
      const { data } = await api.post('/contacts/import', { contacts: parsedContacts });
      alert(`${data.imported} contactos importados con éxito`);
      load();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      if (msg.toLowerCase().includes('límite') || msg.toLowerCase().includes('plan free')) {
        setShowUpgrade(true);
      } else {
        alert(`Error al importar: ${msg}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#17201C] tracking-tight">Contactos</h1>
          <p className="text-xs text-[#64716B] mt-1 font-medium">Administra tu base de contactos y audiencias segmentadas</p>
        </div>
        <label className="btn-secondary cursor-pointer text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-2xs">
          <span>📥</span> Importar CSV
          <input type="file" accept=".csv" className="hidden" onChange={handleCSV} />
        </label>
      </div>

      {/* Agregar contacto */}
      <div className="card space-y-3">
        <h2 className="text-xs font-semibold text-[#17201C] uppercase tracking-wider">Agregar nuevo contacto</h2>
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
          <input
            className="input flex-1"
            placeholder="Nombre completo"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
          />
          <input
            className="input flex-1 font-mono"
            placeholder="+573001234567"
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            required
          />
          <input
            className="input flex-1"
            placeholder="Etiquetas (vip, cliente...)"
            value={form.tags}
            onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
          />
          <button type="submit" className="btn-primary shrink-0" disabled={saving}>
            {saving ? 'Guardando...' : 'Agregar'}
          </button>
        </form>
        <p className="text-[11px] text-[#64716B]">
          Formato CSV sugerido: <code className="bg-[#F8FAF9] px-1.5 py-0.5 rounded border border-[#E4ECE7] font-mono text-[10px]">nombre,telefono,etiquetas</code>
        </p>
      </div>

      {/* Lista */}
      <div className="card overflow-hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E4ECE7]">
          <div>
            <h2 className="text-sm font-bold text-[#17201C]">Directorio de Contactos</h2>
            <p className="text-xs text-[#64716B] mt-0.5 font-medium">
              {searchQuery.trim()
                ? `Mostrando ${filteredContacts.length} de ${totalCount} contactos registrados`
                : `${totalCount} ${totalCount === 1 ? 'contacto registrado' : 'contactos registrados'}`}
            </p>
          </div>

          {/* Buscador de contactos */}
          <div className="w-full sm:w-72 relative">
            <input
              type="text"
              className="input text-xs py-2 pl-8 pr-7"
              placeholder="Buscar por nombre o teléfono..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[#64716B] pointer-events-none">
              🔍
            </span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#64716B] hover:text-[#17201C] font-semibold"
                title="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <p className="text-xs text-[#64716B] p-6 text-center font-medium">Cargando contactos...</p>
        ) : contacts.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm font-semibold text-[#17201C] mb-1">No hay contactos todavía</p>
            <p className="text-xs text-[#64716B]">Agrega tu primer contacto arriba o importa un archivo CSV.</p>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm font-semibold text-[#17201C] mb-1">No se encontraron contactos</p>
            <p className="text-xs text-[#64716B]">
              Ningún contacto coincide con &quot;<span className="font-semibold text-[#17201C]">{searchQuery}</span>&quot;.
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="btn-secondary text-xs py-1.5 px-3 mt-3 inline-block"
            >
              Limpiar búsqueda
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E4ECE7]">
                  <th className="text-left py-3 px-3 text-xs font-semibold text-[#64716B] uppercase tracking-wide">Nombre</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-[#64716B] uppercase tracking-wide">Teléfono</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-[#64716B] uppercase tracking-wide">Etiquetas</th>
                  <th className="py-3 px-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4ECE7]">
                {filteredContacts.map((c) => (
                  <tr key={c.id} className="hover:bg-[#F8FAF9] transition-colors">
                    <td className="py-3 px-3 font-semibold text-[#17201C]">{c.name}</td>
                    <td className="py-3 px-3 text-[#64716B] font-mono text-xs">{c.phone}</td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {c.tags?.map((t: string) => (
                          <span key={t} className="bg-[#E8F7F0] text-[#0F8F6F] border border-[#0F8F6F]/20 text-[11px] px-2 py-0.5 rounded-md font-medium">
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Upgrade */}
      {showUpgrade && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#E4ECE7] shadow-xl text-center">
            <div className="w-14 h-14 bg-[#E8F7F0] text-[#0F8F6F] rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl shadow-2xs">
              🚀
            </div>
            <h3 className="text-lg font-bold text-[#17201C] mb-2 tracking-tight">¡Límite de contactos alcanzado!</h3>
            <p className="text-xs text-[#64716B] leading-relaxed mb-6 font-medium">
              Has alcanzado el límite de tu plan <span className="inline-block bg-[#E8F7F0] text-[#0F8F6F] px-2 py-0.5 rounded text-[11px] font-bold">FREE</span>. 
              Actualiza a <span className="font-semibold text-[#17201C]">PRO</span> para importar contactos ilimitados y segmentar campañas avanzadas.
            </p>
            <div className="flex flex-col gap-2.5">
              <a 
                href="/upgrade" 
                className="bg-[#087F5B] hover:bg-[#065F46] text-white py-2.5 px-4 rounded-xl text-xs font-semibold transition-colors shadow-2xs text-center"
              >
                Actualizar a Plan PRO
              </a>
              <button 
                onClick={() => setShowUpgrade(false)}
                className="text-xs text-[#64716B] hover:text-[#17201C] font-medium py-2 transition-colors"
              >
                Seguir con mi plan actual
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
