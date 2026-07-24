'use client';

import React, { useState } from 'react';
import Link from 'next/link';

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
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  if (isLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Cargando abonados...</div>;
  }

  const filteredSubscribers = subscribers.filter((sub) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'current' && sub.paymentStatus === 'current') ||
      (filter === 'due_soon' && sub.paymentStatus === 'due_soon') ||
      (filter === 'overdue' && sub.paymentStatus === 'overdue');

    const matchesSearch =
      sub.name.toLowerCase().includes(search.toLowerCase()) ||
      sub.phone.includes(search);

    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'current':
        return <span className="badge badge-success">● Al día</span>;
      case 'due_soon':
        return <span className="badge badge-warning">● Por vencer</span>;
      case 'overdue':
        return <span className="badge badge-danger">● Vencido</span>;
      default:
        return <span className="badge badge-info">{status}</span>;
    }
  };

  return (
    <div className="glass-card" style={{ padding: '1.5rem' }}>
      {/* Table Filter & Search Controls Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '0.4rem', backgroundColor: 'var(--bg-main)', padding: '0.35rem', borderRadius: 'var(--radius-xl)' }}>
          <button
            onClick={() => setFilter('all')}
            style={{
              border: 'none',
              padding: '0.45rem 0.95rem',
              borderRadius: 'var(--radius-lg)',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              backgroundColor: filter === 'all' ? 'var(--primary-accent)' : 'transparent',
              color: filter === 'all' ? '#ffffff' : 'var(--text-muted)',
              boxShadow: filter === 'all' ? 'var(--shadow-button)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            Todos ({subscribers.length})
          </button>
          <button
            onClick={() => setFilter('current')}
            style={{
              border: 'none',
              padding: '0.45rem 0.95rem',
              borderRadius: 'var(--radius-lg)',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              backgroundColor: filter === 'current' ? 'var(--primary-accent)' : 'transparent',
              color: filter === 'current' ? '#ffffff' : 'var(--text-muted)',
              boxShadow: filter === 'current' ? 'var(--shadow-button)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            Al día ({subscribers.filter((s) => s.paymentStatus === 'current').length})
          </button>
          <button
            onClick={() => setFilter('due_soon')}
            style={{
              border: 'none',
              padding: '0.45rem 0.95rem',
              borderRadius: 'var(--radius-lg)',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              backgroundColor: filter === 'due_soon' ? 'var(--primary-accent)' : 'transparent',
              color: filter === 'due_soon' ? '#ffffff' : 'var(--text-muted)',
              boxShadow: filter === 'due_soon' ? 'var(--shadow-button)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            Por Vencer ({subscribers.filter((s) => s.paymentStatus === 'due_soon').length})
          </button>
          <button
            onClick={() => setFilter('overdue')}
            style={{
              border: 'none',
              padding: '0.45rem 0.95rem',
              borderRadius: 'var(--radius-lg)',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              backgroundColor: filter === 'overdue' ? 'var(--primary-accent)' : 'transparent',
              color: filter === 'overdue' ? '#ffffff' : 'var(--text-muted)',
              boxShadow: filter === 'overdue' ? 'var(--shadow-button)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            Vencidos ({subscribers.filter((s) => s.paymentStatus === 'overdue').length})
          </button>
        </div>

        {/* Search input inside table */}
        <div style={{ flex: 1, maxWidth: '280px' }}>
          <input
            type="text"
            placeholder="Filtrar por nombre o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.95rem',
              borderRadius: 'var(--radius-xl)',
              fontSize: '0.85rem',
            }}
          />
        </div>
      </div>

      {/* Table Data */}
      {filteredSubscribers.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
          <p style={{ fontWeight: 500 }}>No se encontraron abonados con los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="table-responsive" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b', fontWeight: 600 }}>
                <th style={{ padding: '12px 16px' }}>Abonado</th>
                <th style={{ padding: '12px 16px' }}>Teléfono WhatsApp</th>
                <th style={{ padding: '12px 16px' }}>Monto Mensual</th>
                <th style={{ padding: '12px 16px' }}>Fecha Vencimiento</th>
                <th style={{ padding: '12px 16px' }}>Estado Cobranza</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubscribers.map((sub) => (
                <tr key={sub.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s ease' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0f172a' }}>{sub.name}</td>
                  <td style={{ padding: '14px 16px', color: '#475569' }}>{sub.phone}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0f172a' }}>${sub.monthlyAmount}</td>
                  <td style={{ padding: '14px 16px', color: '#475569' }}>{sub.dueDate}</td>
                  <td style={{ padding: '14px 16px' }}>{getStatusBadge(sub.paymentStatus)}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <Link
                      href={`/subscribers/${sub.id}`}
                      style={{
                        backgroundColor: '#f1f5f9',
                        color: '#2563eb',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                      }}
                    >
                      Ver Expediente →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
