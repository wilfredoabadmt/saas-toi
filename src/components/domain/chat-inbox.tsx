'use client';

import React, { useState, useEffect } from 'react';
import { ConversationSummary } from '@/services/chat-inbox.service';
import { MessageLog } from '@/db/schema/message-logs';
import { useToast } from '@/components/ui/toast-provider';
import Link from 'next/link';

export function ChatInbox() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeSubId, setActiveSubId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [inputText, setInputText] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const { addToast } = useToast();

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/chat/conversations');
      const json = await res.json();
      if (json.success) {
        setConversations(json.data);
        if (json.data.length > 0 && !activeSubId) {
          setActiveSubId(json.data[0].subscriberId || null);
        }
      }
    } catch {
      addToast('Error al cargar conversaciones', 'error');
    } finally {
      setLoadingChats(false);
    }
  };

  const fetchMessages = async (subId: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/chat/messages?subscriberId=${subId}`);
      const json = await res.json();
      if (json.success) {
        setMessages(json.data);
      }
    } catch {
      addToast('Error al cargar historial de mensajes', 'error');
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (activeSubId) {
      fetchMessages(activeSubId);
    }
  }, [activeSubId]);

  const activeConversation = conversations.find((c) => c.subscriberId === activeSubId);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeSubId) return;

    setSending(true);
    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriberId: activeSubId, message: inputText }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error al enviar mensaje');

      setInputText('');
      addToast('Mensaje enviado por WhatsApp', 'success');
      fetchMessages(activeSubId);
      fetchConversations();
    } catch (err) {
      addToast((err as Error).message, 'error');
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  const getStatusBadge = (st?: string) => {
    switch (st) {
      case 'current': return <span className="badge badge-success">● Al día</span>;
      case 'due_soon': return <span className="badge badge-warning">● Por vencer</span>;
      case 'overdue': return <span className="badge badge-danger">● Vencido</span>;
      default: return <span className="badge badge-info">{st || 'Activo'}</span>;
    }
  };

  return (
    <div className="glass-card" style={{ display: 'grid', gridTemplateColumns: '280px 1fr 300px', height: 'calc(100vh - 160px)', minHeight: '600px', overflow: 'hidden' }}>
      
      {/* Columna 1: Hilos de Conversación */}
      <div style={{ borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.75rem 0' }}>
            💬 Chat Multi-Agente
          </h2>
          <input
            type="text"
            placeholder="Buscar conversación..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '0.45rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.82rem', outline: 'none', backgroundColor: '#f8fafc' }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingChats ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>Cargando chats...</div>
          ) : filteredConversations.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>No hay chats activos.</div>
          ) : (
            filteredConversations.map((chat) => {
              const isActive = chat.subscriberId === activeSubId;
              return (
                <div
                  key={chat.subscriberId}
                  onClick={() => chat.subscriberId && setActiveSubId(chat.subscriberId)}
                  style={{
                    padding: '0.85rem 1rem',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    backgroundColor: isActive ? '#eff6ff' : 'transparent',
                    borderLeft: isActive ? '4px solid #2563eb' : '4px solid transparent',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>
                      {chat.name}
                    </strong>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                      {new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                      {chat.lastMessage}
                    </p>
                    {chat.unreadCount > 0 && (
                      <span style={{ backgroundColor: '#2563eb', color: '#ffffff', fontSize: '0.65rem', fontWeight: 700, borderRadius: '999px', padding: '1px 6px' }}>
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Columna 2: Ventana Principal de Chat */}
      <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
        {activeConversation ? (
          <>
            {/* Header Chat */}
            <div style={{ padding: '0.85rem 1.25rem', backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <strong style={{ fontSize: '0.98rem', color: '#0f172a' }}>{activeConversation.name}</strong>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{activeConversation.phone}</div>
              </div>
              <div>{getStatusBadge(activeConversation.paymentStatus)}</div>
            </div>

            {/* Historial de Mensajes */}
            <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {loadingMessages ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', marginTop: '2rem' }}>Cargando mensajes...</div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', marginTop: '2rem' }}>No hay mensajes registrados en esta conversación.</div>
              ) : (
                messages.map((msg) => {
                  const isInbound = msg.direction === 'inbound';
                  return (
                    <div
                      key={msg.id}
                      style={{
                        alignSelf: isInbound ? 'flex-start' : 'flex-end',
                        maxWidth: '75%',
                        backgroundColor: isInbound ? '#ffffff' : '#2563eb',
                        color: isInbound ? '#0f172a' : '#ffffff',
                        padding: '0.65rem 0.95rem',
                        borderRadius: isInbound ? '14px 14px 14px 2px' : '14px 14px 2px 14px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        fontSize: '0.88rem',
                        lineHeight: 1.4,
                      }}
                    >
                      <div>{msg.contentPreview}</div>
                      <div style={{ fontSize: '0.65rem', marginTop: '0.35rem', textAlign: 'right', opacity: 0.85 }}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {!isInbound && (
                          <span style={{ marginLeft: '0.35rem' }}>
                            {msg.deliveryStatus === 'read' ? '✓✓' : msg.deliveryStatus === 'delivered' ? '✓✓' : '✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input para responder */}
            <form onSubmit={handleSendMessage} style={{ padding: '0.85rem 1rem', backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.6rem' }}>
              <input
                type="text"
                placeholder="Escribe una respuesta al abonado..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                style={{ flex: 1, padding: '0.6rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
              />
              <button type="submit" className="btn-primary" disabled={sending || !inputText.trim()}>
                {sending ? 'Enviando...' : 'Enviar 🚀'}
              </button>
            </form>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', flexDirection: 'column' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💬</div>
            <p>Selecciona una conversación de la izquierda para comenzar.</p>
          </div>
        )}
      </div>

      {/* Columna 3: Ficha Contextual del Abonado (Panel Lateral US3) */}
      <div style={{ borderLeft: '1px solid #e2e8f0', backgroundColor: '#ffffff', padding: '1.25rem', overflowY: 'auto' }}>
        {activeConversation ? (
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
              📋 Ficha del Abonado
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block', fontWeight: 600 }}>NOMBRE</span>
                <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>{activeConversation.name}</strong>
              </div>

              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block', fontWeight: 600 }}>TELÉFONO WHATSAPP</span>
                <span style={{ color: '#0f172a', fontWeight: 600 }}>{activeConversation.phone}</span>
              </div>

              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block', fontWeight: 600 }}>EMAIL</span>
                <span style={{ color: '#0f172a' }}>{activeConversation.email || 'No registrado'}</span>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b', fontSize: '0.72rem', display: 'block', fontWeight: 700, textTransform: 'uppercase' }}>PLAN DE INTERNET</span>
                <strong style={{ color: '#2563eb', fontSize: '0.92rem', display: 'block', margin: '0.2rem 0' }}>Fibra 100 Mbps Hogar</strong>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Tarifa: <strong>${activeConversation.monthlyAmount || '25.000'}</strong>/mes</span>
              </div>

              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>ESTADO DE COBRANZA</span>
                <div>{getStatusBadge(activeConversation.paymentStatus)}</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.25rem' }}>
                  Vencimiento: <strong>{activeConversation.dueDate || 'N/A'}</strong>
                </div>
              </div>

              <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                <Link
                  href={`/subscribers/${activeConversation.subscriberId}`}
                  style={{ display: 'block', textAlign: 'center', backgroundColor: '#f1f5f9', color: '#2563eb', padding: '0.5rem', borderRadius: '6px', fontWeight: 600, textDecoration: 'none', fontSize: '0.82rem' }}
                >
                  Ver Expediente Completo →
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', marginTop: '2rem' }}>
            No hay información de abonado seleccionada.
          </div>
        )}
      </div>

    </div>
  );
}
