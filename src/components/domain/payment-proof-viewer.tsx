'use client';

import React from 'react';

export interface PaymentProofItem {
  id: string;
  s3Key: string;
  presignedUrl?: string;
  reviewStatus: 'pending' | 'approved' | 'rejected' | string;
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
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '1.25rem',
        marginBottom: '1rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
          Recibido: {new Date(proof.uploadedAt).toLocaleString('es-CL')}
        </span>
        {getBadge(proof.reviewStatus)}
      </div>

      {proof.presignedUrl ? (
        <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
          <img
            src={proof.presignedUrl}
            alt="Comprobante de pago"
            style={{ maxWidth: '100%', maxHeight: '240px', borderRadius: '8px', objectFit: 'contain', border: '1px solid #cbd5e1' }}
          />
        </div>
      ) : (
        <div style={{ padding: '1rem', backgroundColor: '#ffffff', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', color: '#475569' }}>
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
              backgroundColor: '#ffffff',
              color: '#2563eb',
              border: '1px solid #cbd5e1',
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
