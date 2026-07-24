'use client';

import React, { useState } from 'react';
import { useToast } from '@/components/ui/toast-provider';

export function CsvImportForm() {
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    duplicates: number;
    errors: Array<{ row: number; reason: string }>;
    total: number;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { addToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/subscribers/import', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Error al importar CSV');
      }

      setResult(json.data);
      addToast(`Importación exitosa: ${json.data.imported} nuevos abonados`, 'success');
    } catch (err) {
      setErrorMsg((err as Error).message);
      addToast((err as Error).message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-card" style={{ padding: '2rem', maxWidth: '650px' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
            Seleccionar archivo CSV de Abonados
          </label>
          <div
            style={{
              border: '2px dashed #cbd5e1',
              borderRadius: '12px',
              padding: '2rem',
              textAlign: 'center',
              backgroundColor: 'var(--bg-main)',
              cursor: 'pointer',
              transition: 'border-color 0.2s ease',
            }}
          >
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>📄</span>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              style={{ display: 'block', width: '100%', fontSize: '0.85rem' }}
            />
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
              Formato de columnas: <code>nombre,telefono,plan,monto,fecha_vencimiento</code>
            </p>
          </div>
        </div>

        <button type="submit" disabled={!file || isSubmitting} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
          {isSubmitting ? '🔄 Procesando Lote de Abonados...' : '🚀 Ejecutar Importación Masiva'}
        </button>
      </form>

      {errorMsg && (
        <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '10px', fontSize: '0.9rem' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '1.5rem', padding: '1.25rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-main)', fontWeight: 700 }}>Resumen de Importación</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.9rem' }}>
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', display: 'block' }}>NUEVOS IMPORTADOS</span>
              <strong style={{ fontSize: '1.25rem', color: '#15803d' }}>{result.imported}</strong>
            </div>
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', display: 'block' }}>DUPLICADOS OMITIDOS</span>
              <strong style={{ fontSize: '1.25rem', color: '#a16207' }}>{result.duplicates}</strong>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
              <h5 style={{ margin: '0 0 0.5rem 0', color: '#b91c1c' }}>Registros con errores ({result.errors.length}):</h5>
              <ul style={{ fontSize: '0.82rem', color: '#b91c1c', paddingLeft: '1.25rem', margin: 0 }}>
                {result.errors.map((err, idx) => (
                  <li key={idx}>Fila {err.row}: {err.reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
