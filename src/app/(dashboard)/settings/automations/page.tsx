'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/toast-provider';

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  triggerType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  stepCount: number;
  executionCount: number;
}

interface WorkflowStep {
  stepType: 'trigger' | 'action' | 'condition' | 'delay';
  actionType?: string;
  config?: Record<string, unknown>;
  trueStepId?: string;
  falseStepId?: string;
}

interface WorkflowForm {
  name: string;
  description: string;
  triggerType: string;
  steps: WorkflowStep[];
}

const TRIGGER_TYPES = [
  { value: 'new_subscriber', label: 'Nuevo Abonado', icon: '👤' },
  { value: 'payment_registered', label: 'Pago Registrado', icon: '💳' },
  { value: 'payment_overdue', label: 'Pago Vencido', icon: '⚠️' },
  { value: 'ticket_created', label: 'Ticket Creado', icon: '🎫' },
  { value: 'ticket_closed', label: 'Ticket Cerrado', icon: '✅' },
  { value: 'specific_date', label: 'Fecha Específica', icon: '📅' },
];

const ACTION_TYPES = [
  { value: 'send_whatsapp_message', label: 'Enviar Mensaje WhatsApp', icon: '💬' },
  { value: 'wait', label: 'Esperar', icon: '⏳' },
  { value: 'update_field', label: 'Actualizar Campo', icon: '📝' },
  { value: 'notify_agent', label: 'Notificar Agente', icon: '🔔' },
  { value: 'add_tag', label: 'Agregar Etiqueta', icon: '🏷️' },
  { value: 'remove_tag', label: 'Quitar Etiqueta', icon: '🏷️' },
];

export default function AutomationsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<WorkflowForm>({
    name: '',
    description: '',
    triggerType: 'new_subscriber',
    steps: [{ stepType: 'trigger' as const }],
  });
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  const fetchWorkflows = async () => {
    try {
      const res = await fetch('/api/workflows');
      const json = await res.json();
      if (json.success) {
        setWorkflows(json.data.workflows);
      }
    } catch {
      addToast('Error al cargar workflows', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const handleAddStep = () => {
    setFormData({
      ...formData,
      steps: [...formData.steps, { stepType: 'action', actionType: 'send_whatsapp_message', config: {} }],
    });
  };

  const handleRemoveStep = (index: number) => {
    if (formData.steps.length <= 1) return;
    setFormData({
      ...formData,
      steps: formData.steps.filter((_, i) => i !== index),
    });
  };

  const handleStepChange = (index: number, field: string, value: string) => {
    const updatedSteps = [...formData.steps];
    const step = updatedSteps[index];
    if (step) {
      updatedSteps[index] = { ...step, [field]: value } as WorkflowStep;
      setFormData({ ...formData, steps: updatedSteps });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      addToast('El nombre del workflow es requerido', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.success) {
        addToast('Workflow creado exitosamente', 'success');
        setShowCreateModal(false);
        setFormData({
          name: '',
          description: '',
          triggerType: 'new_subscriber',
          steps: [{ stepType: 'trigger' as const }],
        });
        fetchWorkflows();
      } else {
        addToast(json.error?.message || 'Error al crear workflow', 'error');
      }
    } catch {
      addToast('Error al comunicar con el servidor', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (workflow: Workflow) => {
    const newStatus = workflow.status === 'active' ? 'draft' : 'active';
    try {
      const res = await fetch(`/api/workflows/${workflow.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        addToast(`Workflow ${newStatus === 'active' ? 'activado' : 'desactivado'}`, 'success');
        fetchWorkflows();
      }
    } catch {
      addToast('Error al actualizar workflow', 'error');
    }
  };

  const handleDelete = async (workflowId: string) => {
    if (!confirm('¿Estás seguro de eliminar este workflow?')) return;
    try {
      const res = await fetch(`/api/workflows/${workflowId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        addToast('Workflow eliminado', 'success');
        fetchWorkflows();
      }
    } catch {
      addToast('Error al eliminar workflow', 'error');
    }
  };

  const getTriggerLabel = (triggerType: string) => {
    return TRIGGER_TYPES.find((t) => t.value === triggerType)?.label || triggerType;
  };

  const getTriggerIcon = (triggerType: string) => {
    return TRIGGER_TYPES.find((t) => t.value === triggerType)?.icon || '⚙️';
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-main)', margin: 0 }}>
          Automatizaciones de Workflow
        </h1>
        <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0 0', fontSize: '0.92rem' }}>
          Crea flujos automatizados para nurturir suscriptores y gestionar tareas repetitivas
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {workflows.length} workflow{workflows.length !== 1 ? 's' : ''}
        </span>
        <button className="neu-btn-primary" onClick={() => setShowCreateModal(true)}>
          + Crear Workflow
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando workflows...</div>
      ) : workflows.length === 0 ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚡</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>
            No hay workflows creados
          </h3>
          <p style={{ color: 'var(--text-muted)', margin: '0 0 1.5rem 0', fontSize: '0.9rem' }}>
            Crea tu primer workflow para automatizar tareas repetitivas
          </p>
          <button className="neu-btn-primary" onClick={() => setShowCreateModal(true)}>
            + Crear Primer Workflow
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {workflows.map((wf) => (
            <div key={wf.id} className="glass-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>{getTriggerIcon(wf.triggerType)}</span>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                      {wf.name}
                    </h3>
                    <span
                      className={`badge ${wf.status === 'active' ? 'badge-success' : 'badge-warning'}`}
                      style={{ textTransform: 'uppercase', fontSize: '0.75rem' }}
                    >
                      {wf.status === 'active' ? '● Activo' : '○ Borrador'}
                    </span>
                  </div>
                  {wf.description && (
                    <p style={{ color: 'var(--text-muted)', margin: '0 0 0.5rem 0', fontSize: '0.85rem' }}>
                      {wf.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>Trigger: {getTriggerLabel(wf.triggerType)}</span>
                    <span>Pasos: {wf.stepCount}</span>
                    <span>Ejecuciones: {wf.executionCount}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    className={wf.status === 'active' ? 'neu-btn' : 'neu-btn-primary'}
                    onClick={() => handleToggleStatus(wf)}
                    style={{ fontSize: '0.85rem' }}
                  >
                    {wf.status === 'active' ? '⏸ Pausar' : '▶ Activar'}
                  </button>
                  <button
                    className="neu-btn"
                    onClick={() => handleDelete(wf.id)}
                    style={{ fontSize: '0.85rem', color: '#f43f5e' }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Workflow Modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateModal(false);
          }}
        >
          <div
            className="glass-card"
            style={{
              padding: '2rem',
              width: '100%',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 1.5rem 0' }}>
              Crear Nuevo Workflow
            </h2>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                  Nombre del Workflow *
                </label>
                <input
                  type="text"
                  className="neu-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Bienvenida a nuevos suscriptores"
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                  Descripción
                </label>
                <textarea
                  className="neu-input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe qué hace este workflow"
                  rows={2}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                  Tipo de Trigger *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.5rem' }}>
                  {TRIGGER_TYPES.map((trigger) => (
                    <button
                      key={trigger.value}
                      type="button"
                      className={formData.triggerType === trigger.value ? 'neu-btn-primary' : 'neu-btn'}
                      onClick={() => setFormData({ ...formData, triggerType: trigger.value })}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        justifyContent: 'center',
                        padding: '0.75rem',
                        fontSize: '0.85rem',
                      }}
                    >
                      <span>{trigger.icon}</span>
                      <span>{trigger.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <label style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.85rem' }}>
                    Pasos del Workflow
                  </label>
                  <button type="button" className="neu-btn" onClick={handleAddStep} style={{ fontSize: '0.8rem' }}>
                    + Agregar Paso
                  </button>
                </div>

                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {formData.steps.map((step, index) => (
                    <div
                      key={index}
                      className="neu-card"
                      style={{
                        padding: '1rem',
                        display: 'flex',
                        gap: '0.75rem',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span style={{ fontWeight: 800, color: 'var(--primary-accent)', minWidth: '2rem' }}>
                        {index + 1}.
                      </span>
                      <select
                        className="neu-input"
                        value={step.stepType}
                        onChange={(e) => handleStepChange(index, 'stepType', e.target.value)}
                        style={{ flex: 1, minWidth: '120px' }}
                      >
                        <option value="trigger">Trigger</option>
                        <option value="action">Acción</option>
                        <option value="condition">Condición</option>
                        <option value="delay">Espera</option>
                      </select>
                      {step.stepType === 'action' && (
                        <select
                          className="neu-input"
                          value={step.actionType || ''}
                          onChange={(e) => handleStepChange(index, 'actionType', e.target.value)}
                          style={{ flex: 1, minWidth: '150px' }}
                        >
                          {ACTION_TYPES.map((action) => (
                            <option key={action.value} value={action.value}>
                              {action.icon} {action.label}
                            </option>
                          ))}
                        </select>
                      )}
                      {formData.steps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStep(index)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#f43f5e',
                            cursor: 'pointer',
                            fontSize: '1.2rem',
                            padding: '0.25rem',
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="neu-btn" onClick={() => setShowCreateModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="neu-btn-primary" disabled={saving}>
                  {saving ? 'Guardando...' : 'Crear Workflow'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
