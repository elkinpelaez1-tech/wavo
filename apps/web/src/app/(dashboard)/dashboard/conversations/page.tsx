'use client';
import { useEffect, useState, useRef, useMemo } from 'react';
import api from '@/lib/api';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface Contact {
  id: string;
  name: string;
  phone: string;
  phone_normalized: string;
  tags?: string[];
  custom_fields?: Record<string, any>;
  opted_out?: boolean;
}

interface Campaign {
  id: string;
  name: string;
}

interface Conversation {
  id: string;
  user_id: string;
  contact_id: string;
  last_campaign_id?: string | null;
  status: string;
  unread_count: number;
  last_message_text?: string | null;
  last_message_at?: string | null;
  created_at: string;
  updated_at: string;
  contact?: Contact | null;
  campaign?: Campaign | null;
}

interface Message {
  id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  sender_type: 'contact' | 'user';
  message_type: string;
  body?: string | null;
  meta_message_id?: string | null;
  status?: string | null;
  context_message_id?: string | null;
  raw_payload?: any;
  created_at: string;
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showMobileDetails, setShowMobileDetails] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Cargar lista de conversaciones
  const fetchConversations = async (showLoading = false) => {
    if (showLoading) setLoadingList(true);
    try {
      const { data } = await api.get('/conversations');
      setConversations(data || []);
      // Si hay conversaciones y no hay ninguna seleccionada, seleccionar la primera en pantallas grandes
      if (data?.length > 0 && !selectedId && typeof window !== 'undefined' && window.innerWidth >= 768) {
        setSelectedId(data[0].id);
      }
    } catch (err) {
      console.error('Error al cargar conversaciones:', err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchConversations(true);
  }, []);

  // Cargar mensajes de la conversación seleccionada
  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }

    let isCurrent = true;
    setLoadingMessages(true);

    api
      .get(`/conversations/${selectedId}/messages`)
      .then(({ data }) => {
        if (!isCurrent) return;
        setMessages(data?.messages || []);

        // Marcar como leído si tiene mensajes pendientes
        const targetConv = conversations.find((c) => c.id === selectedId);
        if (targetConv && targetConv.unread_count > 0) {
          api.patch(`/conversations/${selectedId}/read`).catch(() => {});
          setConversations((prev) =>
            prev.map((c) => (c.id === selectedId ? { ...c, unread_count: 0 } : c))
          );
        }
      })
      .catch((err) => {
        console.error('Error al cargar mensajes:', err);
      })
      .finally(() => {
        if (isCurrent) setLoadingMessages(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [selectedId]);

  // Auto-scroll al final de los mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Conversación activa
  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === selectedId) || null;
  }, [conversations, selectedId]);

  // Filtrado de conversaciones
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const term = searchQuery.toLowerCase().trim();
    return conversations.filter((c) => {
      const name = c.contact?.name?.toLowerCase() || '';
      const phone = c.contact?.phone?.toLowerCase() || '';
      const phoneNorm = c.contact?.phone_normalized?.toLowerCase() || '';
      const lastMsg = c.last_message_text?.toLowerCase() || '';
      return (
        name.includes(term) ||
        phone.includes(term) ||
        phoneNorm.includes(term) ||
        lastMsg.includes(term)
      );
    });
  }, [conversations, searchQuery]);

  // Formato de fechas para la lista
  const formatListDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      const d = parseISO(dateStr);
      if (isToday(d)) {
        return format(d, 'hh:mm a', { locale: es });
      }
      if (isYesterday(d)) {
        return 'Ayer';
      }
      return format(d, 'd MMM', { locale: es });
    } catch {
      return '';
    }
  };

  // Formato de hora para los mensajes
  const formatMessageTime = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'hh:mm a', { locale: es });
    } catch {
      return '';
    }
  };

  // Formato de separadores de fecha
  const formatDividerDate = (dateStr: string) => {
    try {
      const d = parseISO(dateStr);
      if (isToday(d)) return 'Hoy';
      if (isYesterday(d)) return 'Ayer';
      return format(d, "EEEE, d 'de' MMMM", { locale: es });
    } catch {
      return '';
    }
  };

  // Agrupar mensajes por fecha
  const groupedMessages = useMemo(() => {
    const groups: { dateKey: string; items: Message[] }[] = [];
    messages.forEach((msg) => {
      const dateKey = msg.created_at ? msg.created_at.slice(0, 10) : 'unknown';
      let group = groups.find((g) => g.dateKey === dateKey);
      if (!group) {
        group = { dateKey, items: [] };
        groups.push(group);
      }
      group.items.push(msg);
    });
    return groups;
  }, [messages]);

  return (
    <div className="h-[calc(100vh-7.5rem)] min-h-[550px] bg-wavo-card rounded-2xl border border-wavo-border overflow-hidden shadow-sm flex flex-col md:flex-row">
      {/* ========================================================= */}
      {/* COLUMNA IZQUIERDA: LISTA DE CONVERSACIONES                */}
      {/* ========================================================= */}
      <div
        className={`w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-wavo-border flex flex-col bg-wavo-card ${
          selectedId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Encabezado Lista */}
        <div className="p-4 border-b border-wavo-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-wavo-text">Conversaciones</h1>
              <span className="bg-wavo-sand text-wavo-deep text-xs font-semibold px-2 py-0.5 rounded-full border border-wavo-border">
                {conversations.length}
              </span>
            </div>
            <button
              onClick={() => fetchConversations(false)}
              className="text-wavo-muted hover:text-wavo-green transition-colors p-1.5 rounded-lg hover:bg-wavo-sidebar"
              title="Actualizar conversaciones"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {/* Buscador */}
          <div className="relative">
            <svg
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-wavo-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nombre o teléfono..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-wavo-sand border border-wavo-border text-wavo-text placeholder-wavo-muted focus:outline-none focus:ring-2 focus:ring-wavo-green"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-wavo-muted hover:text-wavo-text text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Listado con scroll */}
        <div className="flex-1 overflow-y-auto divide-y divide-wavo-border/60">
          {loadingList ? (
            <div className="p-8 text-center">
              <div className="inline-block w-6 h-6 border-2 border-wavo-green border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-xs text-wavo-muted">Cargando conversaciones...</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-wavo-sand flex items-center justify-center mx-auto mb-3 text-wavo-muted text-xl">
                💬
              </div>
              <p className="text-sm font-medium text-wavo-text mb-1">
                {searchQuery ? 'Sin resultados' : 'Sin conversaciones'}
              </p>
              <p className="text-xs text-wavo-muted max-w-[200px] mx-auto">
                {searchQuery
                  ? 'No se encontraron conversaciones con ese criterio'
                  : 'Los mensajes que respondan tus contactos aparecerán aquí automáticamente.'}
              </p>
            </div>
          ) : (
            filteredConversations.map((c) => {
              const isSelected = c.id === selectedId;
              const contactName = c.contact?.name || c.contact?.phone || 'Contacto desconocido';
              const initial = contactName.charAt(0).toUpperCase();
              const hasUnread = (c.unread_count || 0) > 0;

              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedId(c.id);
                    setShowMobileDetails(false);
                  }}
                  className={`w-full p-3.5 text-left flex items-start gap-3 transition-colors relative cursor-pointer ${
                    isSelected
                      ? 'bg-wavo-sidebar border-l-4 border-wavo-green'
                      : 'hover:bg-wavo-sidebar/50 bg-wavo-card'
                  }`}
                >
                  {/* Avatar con Inicial */}
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-wavo-mist text-wavo-deep font-bold flex items-center justify-center text-sm border border-wavo-green/20">
                      {initial}
                    </div>
                    {hasUnread && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-wavo-green border-2 border-white rounded-full" />
                    )}
                  </div>

                  {/* Datos de la conversación */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <p className={`text-xs truncate ${hasUnread ? 'font-bold text-wavo-text' : 'font-medium text-wavo-text'}`}>
                        {contactName}
                      </p>
                      <span className="text-[10px] text-wavo-muted flex-shrink-0">
                        {formatListDate(c.last_message_at)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs truncate ${hasUnread ? 'font-semibold text-wavo-green' : 'text-wavo-muted'}`}>
                        {c.last_message_text || 'Sin mensajes aún'}
                      </p>
                      {hasUnread && (
                        <span className="bg-wavo-green text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center flex-shrink-0">
                          {c.unread_count}
                        </span>
                      )}
                    </div>

                    {/* Badge adicional si tiene campaña u opt-out */}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {c.contact?.opted_out && (
                        <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">
                          Opt-out
                        </span>
                      )}
                      {c.campaign?.name && (
                        <span className="text-[9px] bg-[#E1F5EE] text-[#0F6E56] px-1.5 py-0.5 rounded font-medium truncate max-w-[140px]">
                          📢 {c.campaign.name}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* ÁREA CENTRAL: HISTORIAL DE MENSAJES                       */}
      {/* ========================================================= */}
      <div
        className={`flex-1 flex flex-col bg-wavo-sand/40 min-w-0 ${
          !selectedId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {activeConversation ? (
          <>
            {/* Encabezado del Chat */}
            <div className="p-3.5 px-5 bg-wavo-card border-b border-wavo-border flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {/* Botón Volver en Móvil */}
                <button
                  onClick={() => setSelectedId(null)}
                  className="md:hidden p-1.5 -ml-2 text-wavo-muted hover:text-wavo-text"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <div className="w-9 h-9 rounded-full bg-wavo-green text-white font-bold flex items-center justify-center text-sm flex-shrink-0">
                  {activeConversation.contact?.name?.charAt(0).toUpperCase() || 'C'}
                </div>

                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-wavo-text truncate">
                    {activeConversation.contact?.name || 'Contacto'}
                  </h2>
                  <p className="text-[11px] text-wavo-muted truncate">
                    {activeConversation.contact?.phone || activeConversation.contact?.phone_normalized}
                  </p>
                </div>
              </div>

              {/* Badges y Acciones */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {activeConversation.campaign && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] bg-wavo-mist text-wavo-deep px-2.5 py-1 rounded-full font-medium border border-wavo-green/20">
                    📢 {activeConversation.campaign.name}
                  </span>
                )}
                {activeConversation.contact?.opted_out && (
                  <span className="badge-red text-[11px]">Opt-out</span>
                )}
                <button
                  onClick={() => setShowMobileDetails(!showMobileDetails)}
                  className="lg:hidden p-2 text-wavo-muted hover:text-wavo-text rounded-lg hover:bg-wavo-sidebar"
                  title="Ver datos del contacto"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Historial de Mensajes con Scroll */}
            <div className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto">
              {loadingMessages ? (
                <div className="h-full flex items-center justify-center">
                  <div className="inline-block w-6 h-6 border-2 border-wavo-green border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-wavo-muted">
                  <span className="text-3xl mb-2">💬</span>
                  <p className="text-sm font-medium text-wavo-text">Sin mensajes en esta conversación</p>
                  <p className="text-xs mt-1">Los mensajes entrantes se registrarán aquí.</p>
                </div>
              ) : (
                groupedMessages.map((group) => (
                  <div key={group.dateKey} className="space-y-3">
                    {/* Separador de Fecha */}
                    <div className="flex items-center justify-center">
                      <span className="text-[10px] font-medium uppercase tracking-wider bg-wavo-card text-wavo-muted px-3 py-1 rounded-full border border-wavo-border/80 shadow-2xs">
                        {formatDividerDate(group.items[0]?.created_at)}
                      </span>
                    </div>

                    {/* Mensajes del día */}
                    {group.items.map((msg) => {
                      const isInbound = msg.direction === 'inbound';

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isInbound ? 'items-start' : 'items-end'}`}
                        >
                          <div
                            className={`relative px-4 py-2.5 max-w-[85%] md:max-w-[70%] shadow-2xs ${
                              isInbound
                                ? 'bg-white border border-wavo-border text-wavo-text rounded-2xl rounded-tl-xs'
                                : 'bg-[#E1F5EE] border border-[#1D9E75]/30 text-[#0F6E56] rounded-2xl rounded-tr-xs'
                            }`}
                          >
                            {/* Etiqueta de remitente para contexto */}
                            <p className="text-[10px] font-bold mb-1 opacity-70">
                              {isInbound ? activeConversation.contact?.name || 'Cliente' : 'Wavo / Campaña'}
                            </p>

                            {/* Cuerpo del Mensaje */}
                            <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                              {msg.body || `[Mensaje ${msg.message_type}]`}
                            </p>

                            {/* Hora y Estado */}
                            <div className="flex items-center justify-end gap-1 mt-1.5 text-[10px] opacity-60">
                              <span>{formatMessageTime(msg.created_at)}</span>
                              {!isInbound && (
                                <span title={msg.status || 'enviado'}>
                                  {msg.status === 'read' ? '✓✓' : msg.status === 'delivered' ? '✓✓' : '✓'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Banner Informativo Inferior (Modo Solo Lectura - Etapa 1) */}
            <div className="p-3 bg-wavo-card border-t border-wavo-border flex items-center justify-center gap-2 text-xs text-wavo-muted flex-shrink-0">
              <span className="inline-block w-2 h-2 rounded-full bg-wavo-green animate-pulse" />
              <span>Sincronización activa con WhatsApp Cloud API • Historial en tiempo real</span>
            </div>
          </>
        ) : (
          /* Estado Vacío cuando no hay chat seleccionado */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-wavo-sand/20">
            <div className="w-16 h-16 rounded-2xl bg-wavo-mist text-wavo-green flex items-center justify-center text-3xl mb-4 border border-wavo-green/20 shadow-xs">
              💬
            </div>
            <h2 className="text-base font-semibold text-wavo-text mb-1">
              Selecciona una conversación
            </h2>
            <p className="text-xs text-wavo-muted max-w-sm">
              Elige una conversación de la columna izquierda para consultar el historial completo de mensajes recibidos de tus contactos.
            </p>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* PANEL DERECHO: DETALLES DEL CONTACTO                      */}
      {/* ========================================================= */}
      {activeConversation && (
        <div
          className={`w-72 lg:w-80 flex-shrink-0 border-l border-wavo-border bg-wavo-card flex-col p-5 overflow-y-auto ${
            showMobileDetails ? 'flex fixed inset-0 z-50 bg-wavo-card' : 'hidden lg:flex'
          }`}
        >
          {showMobileDetails && (
            <div className="flex justify-between items-center mb-4 lg:hidden">
              <h3 className="text-sm font-bold text-wavo-text">Detalles</h3>
              <button
                onClick={() => setShowMobileDetails(false)}
                className="text-wavo-muted hover:text-wavo-text p-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* Tarjeta Perfil */}
          <div className="text-center pb-5 border-b border-wavo-border">
            <div className="w-16 h-16 rounded-full bg-wavo-green text-white text-2xl font-bold flex items-center justify-center mx-auto mb-3 shadow-sm">
              {activeConversation.contact?.name?.charAt(0).toUpperCase() || 'C'}
            </div>
            <h3 className="text-sm font-bold text-wavo-text">
              {activeConversation.contact?.name || 'Contacto'}
            </h3>
            <p className="text-xs text-wavo-muted mt-0.5">
              {activeConversation.contact?.phone || activeConversation.contact?.phone_normalized}
            </p>

            <div className="mt-3 flex justify-center gap-2">
              {activeConversation.contact?.opted_out ? (
                <span className="badge-red text-[10px]">Opt-out</span>
              ) : (
                <span className="badge-green text-[10px]">Activo en WhatsApp</span>
              )}
            </div>
          </div>

          {/* Información Adicional */}
          <div className="py-4 space-y-4 text-xs">
            {/* Campaña Relacionada */}
            {activeConversation.campaign && (
              <div>
                <p className="label">Campaña de Origen</p>
                <div className="p-2.5 rounded-lg bg-wavo-sand border border-wavo-border">
                  <p className="font-semibold text-wavo-text">{activeConversation.campaign.name}</p>
                </div>
              </div>
            )}

            {/* Etiquetas */}
            {activeConversation.contact?.tags && activeConversation.contact.tags.length > 0 && (
              <div>
                <p className="label">Etiquetas</p>
                <div className="flex flex-wrap gap-1.5">
                  {activeConversation.contact.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="bg-wavo-sand text-wavo-deep px-2 py-0.5 rounded-md border border-wavo-border text-[11px]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Campos Personalizados */}
            {activeConversation.contact?.custom_fields &&
              Object.keys(activeConversation.contact.custom_fields).length > 0 && (
                <div>
                  <p className="label">Campos Personalizados</p>
                  <div className="space-y-1.5">
                    {Object.entries(activeConversation.contact.custom_fields).map(([key, val]) => (
                      <div
                        key={key}
                        className="flex justify-between items-center p-2 rounded-lg bg-wavo-sand/70 border border-wavo-border/60"
                      >
                        <span className="text-wavo-muted font-medium capitalize">{key}:</span>
                        <span className="text-wavo-text font-semibold">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Última Actividad */}
            <div>
              <p className="label">Última Interacción</p>
              <p className="text-wavo-text font-medium">
                {activeConversation.last_message_at
                  ? format(parseISO(activeConversation.last_message_at), "d 'de' MMMM, yyyy - hh:mm a", {
                      locale: es,
                    })
                  : 'Sin fecha registrada'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
