'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', phone: '', tags: '' });
  const [showUpgrade, setShowUpgrade] = useState(false);
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
          <input
            className="input flex-1"
            placeholder="Etiquetas (vips, bogota...)"
            value={form.tags}
            onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
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

      {/* Modal de Upgrade */}
      {showUpgrade && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#FDF8E1] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🚀</span>
              </div>
              <h3 className="text-xl font-bold text-[#2c2a1e] mb-2">¡Límite alcanzado!</h3>
              <p className="text-[#908c72] text-sm mb-6 leading-relaxed">
                Has alcanzado el límite de tu plan <span className="font-bold text-wavo-green">FREE</span>. 
                Actualiza a <span className="font-bold text-[#2c2a1e]">PRO</span> para importar contactos ilimitados y lanzar campañas masivas.
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
                  Seguir con mi plan actual
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
