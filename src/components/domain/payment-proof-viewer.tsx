'use client';

import React, { useState } from 'react';

export interface PaymentProofItem {
  id: string;
  subscriberId: string;
  fileType: string;
  mimeType: string;
  downloadUrl: string;
  reviewStatus: 'pending' | 'approved' | 'rejected' | string;
  createdAt: string;
}

interface PaymentProofViewerProps {
  proof: PaymentProofItem;
  onReviewed?: () => void;
}

export function PaymentProofViewer({ proof, onReviewed }: PaymentProofViewerProps) {
  const [status, setStatus] = useState(proof.reviewStatus);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleReview = async (newStatus: 'approved' | 'rejected') => {
    setIsUpdating(true);

    try {
      const res = await fetch(`/api/subscribers/${proof.subscriberId}/proofs/${proof.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setStatus(newStatus);
        if (onReviewed) onReviewed();
      }
    } catch (err) {
      console.error('[Review Error]:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const getBadgeStyle = (st: string) => {
    switch (st) {
      case 'approved':
        return { backgroundColor: '#dcfce7', color: '#166534' };
      case 'rejected':
        return { backgroundColor: '#fee2e2', color: '#991b1b' };
      default:
        return { backgroundColor: '#fef9c3', color: '#854d0e' };
    }
  };

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '1rem', marginBottom: '1rem', backgroundColor: '#ffffff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Recibido: {new Date(proof.createdAt).toLocaleString()} ({proof.fileType})
          </span>
        </div>
        <span style={{ ...getBadgeStyle(status), padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
          {status === 'approved' ? 'Aprobado' : status === 'rejected' ? 'Rechazado' : 'Pendiente de Revisión'}
        </span>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        {proof.mimeType.includes('pdf') ? (
          <a
            href={proof.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 'bold' }}
          >
            📄 Ver Comprobante PDF (abrir en ventana)
          </a>
        ) : (
          <img
            src={proof.downloadUrl}
            alt="Comprobante de pago"
            style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
          />
        )}
      </div>

      {status === 'pending' && (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => handleReview('approved')}
            disabled={isUpdating}
            style={{
              backgroundColor: '#16a34a',
              color: '#ffffff',
              border: 'none',
              padding: '0.4rem 0.8rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            ✅ Aprobar Pago
          </button>
          <button
            onClick={() => handleReview('rejected')}
            disabled={isUpdating}
            style={{
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              padding: '0.4rem 0.8rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            ❌ Rechazar
          </button>
        </div>
      )}
    </div>
  );
}
