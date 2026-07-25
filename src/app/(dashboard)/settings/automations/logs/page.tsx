'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/toast-provider';

interface Workflow {
  id: string;
  name: string;
  triggerType: string;
  status: string;
}

interface Execution {
  id: string;
  workflowId: string;
  subscriberId: string;
  status: string;
  iterationCount: number;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
}

interface ExecutionLog {
  id: string;
  executionId: string;
  stepId: string | null;
  stepType: string | null;
  actionType: string | null;
  status: string;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  executedAt: string;
}

export default function WorkflowLogsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
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
    fetchWorkflows();
  }, []);

  useEffect(() => {
    if (!selectedWorkflowId) {
      setExecutions([]);
      setSelectedExecution(null);
      setExecutionLogs([]);
      return;
    }

    const fetchExecutions = async () => {
      try {
        const params = new URLSearchParams();
        if (statusFilter) params.set('status', statusFilter);
        const res = await fetch(`/api/workflows/${selectedWorkflowId}/logs?${params.toString()}`);
        const json = await res.json();
        if (json.success) {
          setExecutions(json.data.executions);
        }
      } catch {
        addToast('Error al cargar ejecuciones', 'error');
      }
    };
    fetchExecutions();
  }, [selectedWorkflowId, statusFilter]);

  const handleViewExecution = async (execution: Execution) => {
    setSelectedExecution(execution);
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/workflows/${selectedWorkflowId}/logs`);
      const json = await res.json();
      if (json.success) {
        setExecutionLogs(json.data.executions.find((e: Execution) => e.id === execution.id)?.logs || []);
      }
    } catch {
      addToast('Error al cargar logs', 'error');
    } finally {
      setLoadingLogs(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <span className="badge badge-warning">⏳ En ejecución</span>;
      case 'completed':
        return <span className="badge badge-success">✅ Completado</span>;
      case 'failed':
        return <span className="badge badge-error">❌ Fallido</span>;
      case 'success':
        return <span className="badge badge-success">✅ Éxito</span>;
      case 'skipped':
        return <span className="badge badge-warning">⏭ Saltado</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Cargando workflows...
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-main)', margin: 0 }}>
          Logs de Ejecución
        </h1>
        <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0 0', fontSize: '0.92rem' }}>
          Monitorea el historial de ejecuciones de tus workflows automatizados
        </p>
      </div>

      {/* Filters */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
              Workflow
            </label>
            <select
              className="neu-input"
              value={selectedWorkflowId}
              onChange={(e) => setSelectedWorkflowId(e.target.value)}
            >
              <option value="">Seleccionar workflow...</option>
              {workflows.map((wf) => (
                <option key={wf.id} value={wf.id}>
                  {wf.name} ({wf.status})
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label style={{ display: 'block', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
              Estado
            </label>
            <select
              className="neu-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="running">En ejecución</option>
              <option value="completed">Completado</option>
              <option value="failed">Fallido</option>
            </select>
          </div>
        </div>
      </div>

      {/* Executions List */}
      {!selectedWorkflowId ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>
            Selecciona un workflow
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Elige un workflow para ver su historial de ejecuciones
          </p>
        </div>
      ) : executions.length === 0 ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>
            Sin ejecuciones
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Este workflow aún no tiene ejecuciones registradas
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {executions.map((exec) => (
            <div
              key={exec.id}
              className="glass-card"
              style={{
                padding: '1.5rem',
                cursor: 'pointer',
                border: selectedExecution?.id === exec.id ? '2px solid var(--primary-accent)' : undefined,
              }}
              onClick={() => handleViewExecution(exec)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                      Ejecución #{exec.id.slice(0, 8)}
                    </span>
                    {getStatusBadge(exec.status)}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>Iniciado: {formatDate(exec.startedAt)}</span>
                    {exec.completedAt && <span> · Completado: {formatDate(exec.completedAt)}</span>}
                  </div>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                  <div>Subscriber: {exec.subscriberId.slice(0, 8)}...</div>
                  <div>Iteraciones: {exec.iterationCount}/10</div>
                </div>
              </div>
              {exec.errorMessage && (
                <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: 'rgba(244,63,94,0.1)', borderRadius: '0.5rem', fontSize: '0.8rem', color: '#f43f5e' }}>
                  {exec.errorMessage}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Execution Detail Modal */}
      {selectedExecution && (
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
            if (e.target === e.currentTarget) {
              setSelectedExecution(null);
              setExecutionLogs([]);
            }
          }}
        >
          <div
            className="glass-card"
            style={{
              padding: '2rem',
              width: '100%',
              maxWidth: '700px',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Detalle de Ejecución
              </h2>
              <button
                onClick={() => {
                  setSelectedExecution(null);
                  setExecutionLogs([]);
                }}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ×
              </button>
            </div>

            <div className="neu-card" style={{ padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>ID:</span>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{selectedExecution.id.slice(0, 8)}...</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Estado:</span>
                  <div>{getStatusBadge(selectedExecution.status)}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Inicio:</span>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{formatDate(selectedExecution.startedAt)}</div>
                </div>
                {selectedExecution.completedAt && (
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Fin:</span>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{formatDate(selectedExecution.completedAt)}</div>
                  </div>
                )}
              </div>
            </div>

            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 1rem 0' }}>
              Historial de Pasos
            </h3>

            {loadingLogs ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando logs...</div>
            ) : executionLogs.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No hay logs registrados para esta ejecución
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {executionLogs.map((log, index) => (
                  <div key={log.id} className="neu-card" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontWeight: 800, color: 'var(--primary-accent)', minWidth: '1.5rem' }}>
                          {index + 1}.
                        </span>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                            {log.stepType || 'N/A'} {log.actionType ? `→ ${log.actionType}` : ''}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {formatDate(log.executedAt)}
                          </div>
                        </div>
                      </div>
                      {getStatusBadge(log.status)}
                    </div>
                    {log.errorMessage && (
                      <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: 'rgba(244,63,94,0.1)', borderRadius: '0.5rem', fontSize: '0.8rem', color: '#f43f5e' }}>
                        {log.errorMessage}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
