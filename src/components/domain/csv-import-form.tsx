'use client';

import React, { useState } from 'react';

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
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: '8px', maxWidth: '600px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Seleccionar archivo CSV</label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
          />
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
            Columnas esperadas: <code>nombre,telefono,plan,monto,fecha_vencimiento</code>
          </p>
        </div>

        <button
          type="submit"
          disabled={!file || isSubmitting}
          style={{
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: 'none',
            padding: '0.75rem 1rem',
            borderRadius: '4px',
            cursor: file && !isSubmitting ? 'pointer' : 'not-allowed',
            fontWeight: 'bold',
          }}
        >
          {isSubmitting ? 'Procesando e Importando...' : 'Importar Abonados'}
        </button>
      </form>

      {errorMsg && (
        <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '4px' }}>
          {errorMsg}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: '4px' }}>
          <h4 style={{ margin: '0 0 0.5rem 0' }}>Resumen de Importación</h4>
          <p style={{ margin: '0.25rem 0' }}>✅ Importados con éxito: <strong>{result.imported}</strong></p>
          <p style={{ margin: '0.25rem 0' }}>⚠️ Duplicados omitidos: <strong>{result.duplicates}</strong></p>
          <p style={{ margin: '0.25rem 0' }}>Total procesados: <strong>{result.total}</strong></p>

          {result.errors.length > 0 && (
            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #cbd5e1' }}>
              <h5 style={{ margin: '0 0 0.25rem 0', color: '#991b1b' }}>Errores en filas ({result.errors.length}):</h5>
              <ul style={{ fontSize: '0.85rem', color: '#7f1d1d', paddingLeft: '1.25rem', margin: '0.25rem 0' }}>
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
