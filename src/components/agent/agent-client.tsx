'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/toast-provider';

type Profile = {
  enabled: boolean;
  name: string;
  tone: string | null;
  instructions: string | null;
  escalationRules: string | null;
  greeting: string | null;
  paymentInstructions: string | null;
  allowPaymentPromise: boolean;
  allowTicketCreation: boolean;
  allowReceiptCapture: boolean;
  maxPromiseDays: number;
};

type KbEntry = {
  id: string;
  kind: 'qa' | 'block';
  question: string | null;
  answer: string | null;
  content: string | null;
};

type KbSize = { chars: number; warnAt: number; warning: boolean };

/* -------------------------------------------------------------------------- */
/* Componentes UI Locales con Obsidian Glass Design System                   */
/* -------------------------------------------------------------------------- */

function Card(props: {
  title: string;
  description?: string;
  icon?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className="glass-card"
      style={{
        padding: '1.75rem',
        borderRadius: '20px',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {props.icon && <span>{props.icon}</span>}
            {props.title}
          </h3>
          {props.description && (
            <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.83rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
              {props.description}
            </p>
          )}
        </div>
        {props.right}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>{props.children}</div>
    </section>
  );
}

function Field(props: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
        {props.label}
      </label>
      {props.children}
      {props.hint && (
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
          {props.hint}
        </span>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.7rem 0.95rem',
  borderRadius: '12px',
  border: '1px solid var(--border-color)',
  background: 'rgba(0, 0, 0, 0.25)',
  color: 'var(--text-main)',
  fontSize: '0.88rem',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
};

function Toggle(props: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        padding: '0.85rem 1rem',
        borderRadius: '14px',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div>
        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)', display: 'block' }}>
          {props.label}
        </span>
        {props.description && (
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.2rem' }}>
            {props.description}
          </span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={props.checked}
        aria-label={props.label}
        disabled={props.disabled}
        onClick={() => props.onChange(!props.checked)}
        style={{
          position: 'relative',
          width: '46px',
          height: '24px',
          borderRadius: '9999px',
          backgroundColor: props.checked ? '#10B981' : 'rgba(255, 255, 255, 0.15)',
          border: 'none',
          cursor: props.disabled ? 'not-allowed' : 'pointer',
          opacity: props.disabled ? 0.5 : 1,
          transition: 'background-color 0.25s ease',
          flexShrink: 0,
          padding: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '3px',
            left: '3px',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            transform: props.checked ? 'translateX(22px)' : 'translateX(0px)',
            transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Componente Principal                                                       */
/* -------------------------------------------------------------------------- */

export function AgentClient() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [aiConfigured, setAiConfigured] = useState(true);
  const [entries, setEntries] = useState<KbEntry[]>([]);
  const [kbSize, setKbSize] = useState<KbSize | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const refetch = useCallback(async () => {
    try {
      const [p, kb, size] = await Promise.all([
        fetch('/api/agent/profile').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/kb').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/kb/size').then((r) => (r.ok ? r.json() : null)),
      ]).catch(() => [null, null, null]);

      if (p) {
        setProfile(p.profile);
        setAiConfigured(p.aiConfigured);
      }
      if (kb) setEntries(kb.entries || []);
      if (size) setKbSize(size);
    } catch {
      addToast('Error al actualizar datos del agente', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const saveProfile = useCallback(
    async (patch: Partial<Profile>, silent = false) => {
      try {
        const res = await fetch('/api/agent/profile', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(patch),
        });
        if (res.ok) {
          if (!silent) addToast('Configuración del agente guardada ✓', 'success');
          void refetch();
        } else {
          addToast('Error al guardar la configuración', 'error');
        }
      } catch {
        addToast('Error de conexión con el servidor', 'error');
      }
    },
    [refetch, addToast]
  );

  if (loading || !profile) {
    return (
      <div style={{ display: 'flex', minHeight: '400px', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.92rem' }}>
        ⏳ Cargando configuración del agente...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', paddingBottom: '3rem' }}>
      {/* Cabecera Principal */}
      <div
        className="glass-card"
        style={{
          padding: '1.5rem 1.75rem',
          borderRadius: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.25rem',
          border: '1px solid var(--border-color)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>
              🤖 Agente de IA (WhatsApp)
            </h1>
            <span
              className={profile.enabled ? 'glass-badge glass-badge-success' : 'glass-badge glass-badge-warning'}
              style={{ fontSize: '0.78rem', fontWeight: 700 }}
            >
              {profile.enabled ? '● Encendido & Atendiendo' : '○ Apagado'}
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0 0', fontSize: '0.88rem' }}>
            Responde preguntas, gestiona soporte técnico y registra cobros/promesas de pago 24/7 por WhatsApp WABA.
          </p>
        </div>

        {/* Master Toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '0.65rem 1.1rem',
            borderRadius: '16px',
            background: 'rgba(0,0,0,0.25)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', display: 'block' }}>
              Estado del Agente
            </span>
            <span style={{ fontSize: '0.75rem', color: profile.enabled ? '#34D399' : 'var(--text-muted)', fontWeight: 600 }}>
              {profile.enabled ? 'Activo en producción' : 'Desactivado'}
            </span>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={profile.enabled}
            disabled={!aiConfigured}
            onClick={() => void saveProfile({ enabled: !profile.enabled })}
            style={{
              position: 'relative',
              width: '52px',
              height: '28px',
              borderRadius: '9999px',
              backgroundColor: profile.enabled ? '#10B981' : 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              cursor: !aiConfigured ? 'not-allowed' : 'pointer',
              opacity: !aiConfigured ? 0.5 : 1,
              transition: 'background-color 0.25s ease',
              flexShrink: 0,
              padding: 0,
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: '3px',
                left: '3px',
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                transform: profile.enabled ? 'translateX(24px)' : 'translateX(0px)',
                transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          </button>
        </div>
      </div>

      {/* Banner de Advertencia si IA no está configurada */}
      {!aiConfigured && (
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderRadius: '16px',
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
          }}
        >
          <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>⚠️</span>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#FBBF24' }}>
              Proveedor de Inteligencia Artificial No Configurado
            </h4>
            <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Para encender el agente, agrega <code style={{ padding: '0.15rem 0.4rem', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', color: '#F8FAFC' }}>OPENROUTER_API_TOKEN</code> y{' '}
              <code style={{ padding: '0.15rem 0.4rem', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', color: '#F8FAFC' }}>OPENROUTER_MODEL</code> a las variables de entorno de tu servidor y reinicia la instancia. Puedes personalizar las reglas e instrucciones aquí abajo mientras tanto.
            </p>
          </div>
        </div>
      )}

      {/* Grid Principal de 2 Columnas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        {/* Columna Izquierda: Comportamiento & Capacidades */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <BehaviorCard profile={profile} onSave={saveProfile} />
          <CapabilitiesCard profile={profile} onSave={saveProfile} />
        </div>

        {/* Columna Derecha: Base de Conocimiento */}
        <div>
          <KbCard entries={entries} kbSize={kbSize} onChanged={() => void refetch()} />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Subcomponente: Comportamiento & Personalidad                              */
/* -------------------------------------------------------------------------- */

function BehaviorCard({
  profile,
  onSave,
}: {
  profile: Profile;
  onSave: (patch: Partial<Profile>) => Promise<void>;
}) {
  const [form, setForm] = useState(profile);
  const [saving, setSaving] = useState(false);

  useEffect(() => setForm(profile), [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <Card
      icon="⚙️"
      title="Comportamiento & Personalidad"
      description="Define el nombre, tono de voz e instrucciones de respuesta para tus abonados."
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Nombre del agente">
            <input
              style={inputStyle}
              placeholder="Ej: Asistente TOI"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>

          <Field label="Tono de voz" hint="Ej: cercano, formal de Ud.">
            <input
              style={inputStyle}
              placeholder="cercano y directo, de usted"
              value={form.tone ?? ''}
              onChange={(e) => setForm({ ...form, tone: e.target.value })}
            />
          </Field>
        </div>

        <Field label="Saludo inicial (Nuevas conversaciones)">
          <input
            style={inputStyle}
            placeholder="Hola, soy el asistente de TOI Telecom. ¿En qué puedo ayudarte hoy?"
            value={form.greeting ?? ''}
            onChange={(e) => setForm({ ...form, greeting: e.target.value })}
          />
        </Field>

        <Field
          label="Instrucciones del negocio (System Prompt)"
          hint="Detalla qué debe responder, productos ISP que ofrecemos y reglas de atención."
        >
          <textarea
            style={{ ...inputStyle, minHeight: '110px', resize: 'vertical' }}
            rows={5}
            placeholder="Eres el asistente virtual oficial de TOI. Responde de forma concisa sobre velocidad de fibra, pagos y fallas técnicas..."
            value={form.instructions ?? ''}
            onChange={(e) => setForm({ ...form, instructions: e.target.value })}
          />
        </Field>

        <Field
          label="Reglas de escalado a soporte humano"
          hint="Condiciones exactas para transferir la conversación a un operador real."
        >
          <textarea
            style={{ ...inputStyle, minHeight: '75px', resize: 'vertical' }}
            rows={3}
            placeholder="Transfiere a un humano si el abonado insiste en cancelar el servicio o reporta corte físico de cable..."
            value={form.escalationRules ?? ''}
            onChange={(e) => setForm({ ...form, escalationRules: e.target.value })}
          />
        </Field>

        <Field
          label="Formas de pago y datos bancarios"
          hint="El agente las enviará textualmente al solicitar datos de pago."
        >
          <textarea
            style={{ ...inputStyle, minHeight: '90px', resize: 'vertical' }}
            rows={4}
            placeholder={'Banco Nacional: Cta Cte 100029384\nOficina Central: Av. Principal Nº 120'}
            value={form.paymentInstructions ?? ''}
            onChange={(e) => setForm({ ...form, paymentInstructions: e.target.value })}
          />
        </Field>

        <button
          type="submit"
          className="glossy-blue-btn"
          disabled={saving}
          style={{
            padding: '0.75rem 1.4rem',
            borderRadius: '12px',
            fontWeight: 800,
            fontSize: '0.9rem',
            alignSelf: 'flex-start',
            marginTop: '0.5rem',
          }}
        >
          {saving ? 'Guardando...' : '💾 Guardar Comportamiento'}
        </button>
      </form>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Subcomponente: Capacidades & Permisos BD                                  */
/* -------------------------------------------------------------------------- */

function CapabilitiesCard({
  profile,
  onSave,
}: {
  profile: Profile;
  onSave: (patch: Partial<Profile>, silent?: boolean) => Promise<void>;
}) {
  return (
    <Card
      icon="⚡"
      title="Capacidades & Permisos de Base de Datos"
      description="Define qué operaciones automáticas puede escribir el agente en el sistema."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <Toggle
          label="💳 Registrar promesas de pago"
          description="Permite pactar prórrogas temporales de pago con el abonado."
          checked={profile.allowPaymentPromise}
          onChange={(v) => void onSave({ allowPaymentPromise: v })}
        />

        <Toggle
          label="🎫 Abrir tickets de soporte técnico"
          description="Crea tickets automáticamente ante reclamos o fallas de internet."
          checked={profile.allowTicketCreation}
          onChange={(v) => void onSave({ allowTicketCreation: v })}
        />

        <Toggle
          label="🧾 Capturar comprobantes de pago"
          description="Recibe fotos o PDFs de transferencias enviadas por WhatsApp."
          checked={profile.allowReceiptCapture}
          onChange={(v) => void onSave({ allowReceiptCapture: v })}
        />
      </div>

      <div style={{ marginTop: '0.5rem' }}>
        <Field
          label="Días máximos para promesa de pago"
          hint="El servidor rechazará automáticamente plazos mayores a este límite."
        >
          <input
            type="number"
            min={1}
            max={30}
            style={{ ...inputStyle, width: '140px' }}
            value={profile.maxPromiseDays}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isInteger(n) && n >= 1 && n <= 30) {
                void onSave({ maxPromiseDays: n }, true);
              }
            }}
          />
        </Field>
      </div>

      {/* Recuadro de Límites de Seguridad */}
      <div
        style={{
          padding: '1rem 1.15rem',
          borderRadius: '14px',
          background: 'rgba(239, 68, 68, 0.06)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          fontSize: '0.82rem',
          color: 'var(--text-main)',
          lineHeight: 1.5,
          marginTop: '0.25rem',
        }}
      >
        <strong style={{ color: '#F87171', display: 'block', marginBottom: '0.25rem' }}>
          🛡️ Salvaguardas de Seguridad Humanas:
        </strong>
        El agente <strong style={{ color: '#F87171' }}>nunca</strong> reconecta ni corta el servicio, no condona deudas, no aprueba pagos ni procesa bajas. Dichas acciones están restringidas exclusivamente a operadores humanos por diseño.
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Subcomponente: Base de Conocimiento (Knowledge Base)                      */
/* -------------------------------------------------------------------------- */

function KbCard({
  entries,
  kbSize,
  onChanged,
}: {
  entries: KbEntry[];
  kbSize: KbSize | null;
  onChanged: () => void;
}) {
  const [tab, setTab] = useState<'qa' | 'block'>('qa');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [block, setBlock] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

  async function addQa(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/kb', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind: 'qa', question, answer }),
      });
      if (res.ok) {
        addToast('Pregunta/Respuesta añadida a la Base de Conocimiento ✓', 'success');
        setQuestion('');
        setAnswer('');
        onChanged();
      } else {
        addToast('Error al añadir P/R', 'error');
      }
    } catch {
      addToast('Error de conexión', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function addBlock(e: React.FormEvent) {
    e.preventDefault();
    if (!block.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/kb', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind: 'block', content: block }),
      });
      if (res.ok) {
        addToast('Bloque de información libre añadido ✓', 'success');
        setBlock('');
        onChanged();
      } else {
        addToast('Error al añadir bloque', 'error');
      }
    } catch {
      addToast('Error de conexión', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    try {
      const res = await fetch(`/api/kb/${id}`, { method: 'DELETE' });
      if (res.ok) {
        addToast('Entrada de conocimiento eliminada', 'info');
        onChanged();
      }
    } catch {
      addToast('Error al eliminar entrada', 'error');
    }
  }

  return (
    <Card
      icon="🧠"
      title="Base de Conocimiento (Knowledge Base)"
      description="La única fuente de verdad para el agente. Todo lo que deba responder sobre planes, cobertura, bancos u horarios debe estar aquí."
      right={
        kbSize ? (
          <span
            className={kbSize.warning ? 'glass-badge glass-badge-warning' : 'glass-badge glass-badge-info'}
            style={{ fontSize: '0.76rem', whiteSpace: 'nowrap' }}
          >
            {kbSize.chars.toLocaleString('es-MX')} caracteres
          </span>
        ) : null
      }
    >
      {/* Alerta de Límite de Contexto */}
      {kbSize?.warning && (
        <div
          style={{
            padding: '0.85rem 1rem',
            borderRadius: '12px',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            fontSize: '0.8rem',
            color: '#FBBF24',
            lineHeight: 1.45,
          }}
        >
          ⚠️ El tamaño del conocimiento es elevado. Se inyecta por completo en cada mensaje, por lo que te sugerimos simplificar o borrar entradas obsoletas.
        </div>
      )}

      {/* Tabs para seleccionar el tipo de entrada */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          background: 'rgba(0,0,0,0.25)',
          padding: '0.35rem',
          borderRadius: '14px',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <button
          type="button"
          onClick={() => setTab('qa')}
          style={{
            flex: 1,
            padding: '0.55rem 0.85rem',
            borderRadius: '10px',
            border: 'none',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
            backgroundColor: tab === 'qa' ? 'var(--primary-accent)' : 'transparent',
            color: tab === 'qa' ? '#FFFFFF' : 'var(--text-muted)',
            transition: 'all 0.2s ease',
          }}
        >
          📌 Pregunta / Respuesta
        </button>
        <button
          type="button"
          onClick={() => setTab('block')}
          style={{
            flex: 1,
            padding: '0.55rem 0.85rem',
            borderRadius: '10px',
            border: 'none',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
            backgroundColor: tab === 'block' ? 'var(--primary-accent)' : 'transparent',
            color: tab === 'block' ? '#FFFFFF' : 'var(--text-muted)',
            transition: 'all 0.2s ease',
          }}
        >
          📄 Bloque de Texto Libre
        </button>
      </div>

      {/* Formulario 1: P/R */}
      {tab === 'qa' && (
        <form
          onSubmit={addQa}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            padding: '1.1rem',
            borderRadius: '16px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-color)',
          }}
        >
          <Field label="Pregunta frecuente del cliente">
            <input
              style={inputStyle}
              placeholder="Ej: ¿Tienen cobertura de fibra óptica en El Alto?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
            />
          </Field>

          <Field label="Respuesta oficial que dará el agente">
            <textarea
              style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }}
              rows={2}
              placeholder="Ej: Sí, contamos con cobertura de fibra óptica de alta velocidad en El Alto y zonas aledañas."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              required
            />
          </Field>

          <button
            type="submit"
            className="glossy-blue-btn"
            disabled={submitting || !question.trim() || !answer.trim()}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.85rem',
              alignSelf: 'flex-start',
            }}
          >
            {submitting ? 'Añadiendo...' : '+ Agregar Pregunta / Respuesta'}
          </button>
        </form>
      )}

      {/* Formulario 2: Bloque libre */}
      {tab === 'block' && (
        <form
          onSubmit={addBlock}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            padding: '1.1rem',
            borderRadius: '16px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-color)',
          }}
        >
          <Field label="Nuevo Bloque de Texto Informativo">
            <textarea
              style={{ ...inputStyle, minHeight: '110px', resize: 'vertical' }}
              rows={4}
              placeholder="Horarios de atención de lunes a sábado de 8:00 a 18:00. Políticas de soporte en sitio dentro de las 24 horas..."
              value={block}
              onChange={(e) => setBlock(e.target.value)}
              required
            />
          </Field>

          <button
            type="submit"
            className="glossy-blue-btn"
            disabled={submitting || !block.trim()}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.85rem',
              alignSelf: 'flex-start',
            }}
          >
            {submitting ? 'Añadiendo...' : '+ Agregar Bloque de Texto'}
          </button>
        </form>
      )}

      {/* Lista de Entradas Almacenadas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
        <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>
          Entradas de Conocimiento ({entries.length})
        </h4>

        {entries.length === 0 ? (
          <div
            style={{
              padding: '2rem 1rem',
              textAlign: 'center',
              borderRadius: '14px',
              background: 'rgba(0, 0, 0, 0.15)',
              border: '1px border-dashed var(--border-color)',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
            }}
          >
            📥 Aún no has agregado datos de conocimiento. Utiliza el formulario arriba para alimentar la información del agente.
          </div>
        ) : (
          entries.map((e) => (
            <div
              key={e.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '1rem',
                padding: '1rem 1.15rem',
                borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-color)',
                transition: 'border-color 0.2s ease',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <span
                    className={e.kind === 'qa' ? 'glass-badge glass-badge-info' : 'glass-badge glass-badge-warning'}
                    style={{ fontSize: '0.7rem', padding: '0.15rem 0.55rem' }}
                  >
                    {e.kind === 'qa' ? 'Pregunta / Respuesta' : 'Bloque Libre'}
                  </span>
                </div>

                {e.kind === 'qa' ? (
                  <>
                    <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {e.question}
                    </p>
                    <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.83rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                      {e.answer}
                    </p>
                  </>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.83rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>
                    {e.content}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => void remove(e.id)}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#F87171',
                  borderRadius: '10px',
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                }}
                title="Eliminar esta entrada"
              >
                🗑️ Eliminar
              </button>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
