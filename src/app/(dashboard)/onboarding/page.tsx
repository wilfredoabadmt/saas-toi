'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function OnboardingPage() {
  const [step1Done] = useState(true); // Default ISP basic setup done
  const [step2Done, setStep2Done] = useState(false);
  const [step3Done, setStep3Done] = useState(false);

  const completedCount = [step1Done, step2Done, step3Done].filter(Boolean).length;
  const progressPercent = Math.round((completedCount / 3) * 100);

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', padding: '1rem 0 3rem 0' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <span style={{ fontSize: '2.5rem' }}>🎉</span>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', margin: '0.5rem 0 0.25rem 0' }}>
          ¡Bienvenido a SaaS TOI ISP!
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
          Completa estos 3 sencillos pasos para dejar lista la cobranza y soporte automatizado de tu ISP
        </p>
      </div>

      {/* Progress Bar Card */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>
            Progreso de Configuración Inicial
          </span>
          <span style={{ fontWeight: 800, color: '#2563eb', fontSize: '0.9rem' }}>
            {progressPercent}% Completado
          </span>
        </div>

        <div style={{ width: '100%', height: '10px', backgroundColor: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
          <div
            style={{
              width: `${progressPercent}%`,
              height: '100%',
              backgroundColor: '#2563eb',
              borderRadius: '5px',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>

      {/* Step Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2.5rem' }}>
        {/* Paso 1 */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
            <div style={{ backgroundColor: '#dcfce7', color: '#16a34a', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', flexShrink: 0 }}>
              1
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.35rem 0' }}>
                Paso 1: Configurar Planes de Internet & Cobranza
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0 }}>
                Define los planes de velocidad (Mbps) y tarifas mensuales de tu ISP para asociarlos a los abonados.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span className="badge badge-success">✓ Listo</span>
            <Link href="/settings/plans" className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
              Configurar Planes
            </Link>
          </div>
        </div>

        {/* Paso 2 */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
            <div style={{ backgroundColor: step2Done ? '#dcfce7' : '#e0f2fe', color: step2Done ? '#16a34a' : '#0284c7', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', flexShrink: 0 }}>
              2
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.35rem 0' }}>
                Paso 2: Importar la Cartera de Abonados
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0 }}>
                Carga tu base de clientes mediante archivo CSV para activar el envío de recordatorios de cobro.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <label style={{ fontSize: '0.8rem', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <input
                type="checkbox"
                checked={step2Done}
                onChange={(e) => setStep2Done(e.target.checked)}
              />
              Marcar listo
            </label>
            <Link href="/subscribers/import" style={{ backgroundColor: '#2563eb', color: '#ffffff', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none' }}>
              Importar CSV
            </Link>
          </div>
        </div>

        {/* Paso 3 */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
            <div style={{ backgroundColor: step3Done ? '#dcfce7' : '#fef3c7', color: step3Done ? '#16a34a' : '#d97706', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', flexShrink: 0 }}>
              3
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.35rem 0' }}>
                Paso 3: Conectar la Cuenta de WhatsApp Business (WABA)
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0 }}>
                Enlaza tus credenciales de Meta Graph API para habilitar las conversaciones y avisos de cobranza.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <label style={{ fontSize: '0.8rem', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <input
                type="checkbox"
                checked={step3Done}
                onChange={(e) => setStep3Done(e.target.checked)}
              />
              Marcar listo
            </label>
            <Link href="/whatsapp" style={{ backgroundColor: '#16a34a', color: '#ffffff', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none' }}>
              Conectar WhatsApp
            </Link>
          </div>
        </div>
      </div>

      {/* CTA Final */}
      <div style={{ textAlign: 'center' }}>
        <Link href="/subscribers" className="btn-primary" style={{ padding: '0.85rem 2rem', fontSize: '1.05rem' }}>
          Ir al Panel de Administración 🚀
        </Link>
      </div>
    </div>
  );
}
