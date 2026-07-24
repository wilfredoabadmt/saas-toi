'use client';

import React from 'react';

interface SkeletonProps {
  rows?: number;
  variant?: 'table' | 'card' | 'text';
}

export function Skeleton({ rows = 5, variant = 'table' }: SkeletonProps) {
  if (variant === 'card') {
    return (
      <div className="glass-card" style={{ padding: '2rem' }}>
        <div className="skeleton-pulse" style={{ height: '1.4rem', width: '55%', borderRadius: '8px', marginBottom: '1.25rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-pulse" style={{ height: '80px', borderRadius: '12px' }} />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skeleton-pulse" style={{ height: '1rem', width: `${85 - i * 8}%`, borderRadius: '6px' }} />
        ))}
      </div>
    );
  }

  // Table variant
  return (
    <div className="glass-card" style={{ padding: '1.5rem' }}>
      <div className="skeleton-pulse" style={{ height: '1.2rem', width: '35%', borderRadius: '8px', marginBottom: '1.25rem' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div className="skeleton-pulse" style={{ height: '2.5rem', flex: 1, borderRadius: '8px' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmptyState({
  icon = '📭',
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: '3.5rem 2rem',
        textAlign: 'center',
        color: 'var(--text-muted)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
      }}
    >
      <div style={{ fontSize: '2.75rem', marginBottom: '0.25rem' }}>{icon}</div>
      <p style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-muted)' }}>{title}</p>
      {description && <p style={{ fontSize: '0.88rem', maxWidth: '380px' }}>{description}</p>}
      {action && <div style={{ marginTop: '0.75rem' }}>{action}</div>}
    </div>
  );
}
