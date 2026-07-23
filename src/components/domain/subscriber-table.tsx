'use client';

import React from 'react';

export interface SubscriberItem {
  id: string;
  name: string;
  phone: string;
  monthlyAmount: string;
  dueDate: string;
  paymentStatus: 'current' | 'due_soon' | 'overdue' | string;
  status: string;
}

interface SubscriberTableProps {
  subscribers: SubscriberItem[];
  isLoading?: boolean;
}

export function SubscriberTable({ subscribers, isLoading }: SubscriberTableProps) {
  if (isLoading) {
    return <p style={{ color: '#64748b' }}>Cargando abonados...</p>;
  }

  if (subscribers.length === 0) {
    return <p style={{ color: '#64748b' }}>No se encontraron abonados.</p>;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'current':
        return <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>Al día</span>;
      case 'due_soon':
        return <span style={{ backgroundColor: '#fef9c3', color: '#854d0e', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>Por vencer</span>;
      case 'overdue':
        return <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>Vencido</span>;
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div style={{ overflowX: 'auto', backgroundColor: '#ffffff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f1f5f9' }}>
            <th style={{ padding: '12px 16px' }}>Nombre</th>
            <th style={{ padding: '12px 16px' }}>Teléfono</th>
            <th style={{ padding: '12px 16px' }}>Monto Mensual</th>
            <th style={{ padding: '12px 16px' }}>Fecha Vencimiento</th>
            <th style={{ padding: '12px 16px' }}>Estado Cobranza</th>
          </tr>
        </thead>
        <tbody>
          {subscribers.map((sub) => (
            <tr key={sub.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '12px 16px', fontWeight: '500' }}>{sub.name}</td>
              <td style={{ padding: '12px 16px' }}>{sub.phone}</td>
              <td style={{ padding: '12px 16px' }}>${sub.monthlyAmount}</td>
              <td style={{ padding: '12px 16px' }}>{sub.dueDate}</td>
              <td style={{ padding: '12px 16px' }}>{getStatusBadge(sub.paymentStatus)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
