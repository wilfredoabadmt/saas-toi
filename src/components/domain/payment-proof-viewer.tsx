'use client';

import React from 'react';

export interface PaymentProofItem {
  id: string;
  s3Key: string;
  presignedUrl?: string;
  reviewStatus: 'pending' | 'approved' | 'rejected' | string;
  extractedAmount?: string;
  extractedBank?: string;
  extractedReference?: string;
  aiConfidence?: number;
  aiVerified?: boolean;
  reviewNotes?: string;
  uploadedAt: string;
}

interface PaymentProofViewerProps {
  proof: PaymentProofItem;
}

export function PaymentProofViewer({ proof }: PaymentProofViewerProps) {
  const getBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="badge badge-success">✓ Aprobado</span>;
      case 'rejected':
        return <span className="badge badge-danger">✗ Rechazado</span>;
      default:
        return <span className="badge badge-warning">⏳ Pendiente Revisión</span>;
    }
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-main)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '1.25rem',
        marginBottom: '1rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          Recibido: {new Date(proof.uploadedAt).toLocaleString('es-BO')}
        </span>
        {getBadge(proof.reviewStatus)}
      </div>

      {/* AI Extraction Banner */}
      {(proof.extractedBank || proof.aiConfidence) && (
        <div
          style={{
            backgroundColor: proof.aiVerified ? 'rgba(34, 197, 94, 0.08)' : 'rgba(234, 179, 8, 0.08)',
            border: proof.aiVerified ? '1px solid rgba(34, 197, 94, 0.25)' : '1px solid rgba(234, 179, 8, 0.25)',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            fontSize: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, marginBottom: '0.35rem' }}>
            <span>🤖 Análisis de Depósito por Agente IA</span>
            {proof.aiConfidence && (
              <span className={proof.aiVerified ? 'badge badge-success' : 'badge badge-warning'}>
                Certeza IA: {proof.aiConfidence}%
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem', color: 'var(--text-main)', marginTop: '0.4rem' }}>
            {proof.extractedBank && <div><strong>Banco/Medio:</strong> {proof.extractedBank}</div>}
            {proof.extractedAmount && <div><strong>Monto Detectado:</strong> Bs. {proof.extractedAmount}</div>}
            {proof.extractedReference && <div><strong>Nro. Ref:</strong> {proof.extractedReference}</div>}
          </div>

          {proof.reviewNotes && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'pre-line' }}>
              {proof.reviewNotes}
            </div>
          )}
        </div>
      )}

      {proof.presignedUrl ? (
        <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
          <img
            src={proof.presignedUrl}
            alt="Comprobante de pago"
            style={{ maxWidth: '100%', maxHeight: '240px', borderRadius: '8px', objectFit: 'contain', border: '1px solid var(--border-color)' }}
          />
        </div>
      ) : (
        <div style={{ padding: '1rem', backgroundColor: 'var(--bg-card)', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          📄 Archivo adjunto S3: <code>{proof.s3Key}</code>
        </div>
      )}

      {proof.presignedUrl && (
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          <a
            href={proof.presignedUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              backgroundColor: 'var(--bg-card)',
              color: 'var(--primary-accent)',
              border: '1px solid var(--border-color)',
              padding: '0.4rem 0.85rem',
              borderRadius: '6px',
              fontSize: '0.82rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            🔍 Ver Imagen en Tamaño Real (S3 Presigned URL)
          </a>
        </div>
      )}
    </div>
  );
}
