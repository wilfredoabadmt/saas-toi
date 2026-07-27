'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/toast-provider';

interface SubscriptionInfo {
  planName: string;
  planSlug: string;
  maxSubscribers: number;
  currentSubscribers: number;
  usagePercent: number;
  status: string;
}

export default function BillingPage() {
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null);
  const [currency, setCurrency] = useState<string>('BOB');
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [logoUrlInput, setLogoUrlInput] = useState<string>('');
  const [savingLogo, setSavingLogo] = useState(false);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const fetchSubscription = async () => {
    try {
      const [subRes, currRes, logoRes] = await Promise.all([
        fetch('/api/subscriptions/current'),
        fetch('/api/organization/currency'),
        fetch('/api/organization/logo'),
      ]);
      const subJson = await subRes.json();
      const currJson = await currRes.json();
      const logoJson = await logoRes.json();

      if (subJson.success) setSubInfo(subJson.data);
      if (currJson.currency) setCurrency(currJson.currency);
      if (logoJson.logoUrl) setLogoUrlInput(logoJson.logoUrl);
    } catch {
      addToast('Error al cargar datos de la suscripción', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLogo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLogo(true);
    try {
      const res = await fetch('/api/organization/logo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoUrl: logoUrlInput }),
      });
      const json = await res.json();
      if (json.success) {
        addToast('Logo personalizado del ISP guardado correctamente', 'success');
      } else {
        addToast(json.message || 'Error al guardar el logo', 'error');
      }
    } catch {
      addToast('Error de conexión al guardar el logo', 'error');
    } finally {
      setSavingLogo(false);
    }
  };

  const handleCurrencyChange = async (newCurrency: string) => {
    setSavingCurrency(true);
    try {
      const res = await fetch('/api/organization/currency', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency: newCurrency }),
      });
      const json = await res.json();
      if (json.success) {
        setCurrency(json.currency);
        addToast(`Moneda de facturación actualizada a ${newCurrency === 'BOB' ? 'Bolivianos (Bs.)' : 'Dólares ($)'}`, 'success');
      } else {
        addToast(json.error?.message || 'Error al guardar la moneda', 'error');
      }
    } catch {
      addToast('Error al comunicar con el servidor', 'error');
    } finally {
      setSavingCurrency(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-main)', margin: 0 }}>
          Suscripción & Configuración de Moneda
        </h1>
        <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0 0', fontSize: '0.92rem' }}>
          Gestión de cupo de abonados, selección de moneda principal (Bs. / $) e historial de facturación de tu ISP
        </p>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando suscripción...</div>
      ) : subInfo ? (
        <>
          {/* Currency Preference Selector Card */}
          <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem', borderLeft: '4px solid var(--primary-accent)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>
                  💱 Moneda de Operación del ISP
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                  Define el símbolo y formato monetario para abonados, planes y recaudación.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  disabled={savingCurrency}
                  className={currency === 'BOB' ? 'neu-btn-primary' : 'neu-btn'}
                  onClick={() => handleCurrencyChange('BOB')}
                  style={{ opacity: savingCurrency ? 0.6 : 1 }}
                >
                  🇧🇴 Bs. (BOB)
                </button>

                <button
                  type="button"
                  disabled={savingCurrency}
                  className={currency === 'USD' ? 'neu-btn-primary' : 'neu-btn'}
                  onClick={() => handleCurrencyChange('USD')}
                  style={{ opacity: savingCurrency ? 0.6 : 1 }}
                >
                  💵 $ (USD)
                </button>

                <button
                  type="button"
                  disabled={savingCurrency}
                  className={currency === 'EUR' ? 'neu-btn-primary' : 'neu-btn'}
                  onClick={() => handleCurrencyChange('EUR')}
                  style={{ opacity: savingCurrency ? 0.6 : 1 }}
                >
                  🇪🇺 € (EUR)
                </button>

                <button
                  type="button"
                  disabled={savingCurrency}
                  className={currency === 'CLP' ? 'neu-btn-primary' : 'neu-btn'}
                  onClick={() => handleCurrencyChange('CLP')}
                  style={{ opacity: savingCurrency ? 0.6 : 1 }}
                >
                  🇨🇱 $ (CLP)
                </button>
              </div>
            </div>
          </div>

          {/* Custom Logo / Branding Card */}
          <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem', borderLeft: '4px solid #818CF8' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.35rem 0' }}>
              🖼️ Logo Personalizado de la Empresa ISP
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>
              Ingresa la URL pública de la imagen del logo de tu ISP para proyectar tu propia marca en el menú lateral y comprobantes.
            </p>

            <form onSubmit={handleSaveLogo} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="url"
                placeholder="https://tu-isp.com/logo.png"
                className="glass-input-dark"
                value={logoUrlInput}
                onChange={(e) => setLogoUrlInput(e.target.value)}
                style={{ flex: 1, minWidth: '240px', padding: '0.65rem 1rem' }}
              />
              <button
                type="submit"
                disabled={savingLogo}
                className="btn-primary"
                style={{ padding: '0.65rem 1.25rem', whiteSpace: 'nowrap' }}
              >
                {savingLogo ? 'Guardando...' : 'Guardar Logo 💾'}
              </button>
            </form>
          </div>

          {/* Main Card Usage */}
          <div className="glass-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span className="badge badge-success" style={{ textTransform: 'uppercase', marginBottom: '0.5rem', display: 'inline-block' }}>
                  ● Estado: {subInfo.status.toUpperCase()}
                </span>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
                  Plan Actual: {subInfo.planName}
                </h2>
              </div>

              <button
                className="neu-btn-primary"
                onClick={() => addToast('Para solicitar upgrade de plan contacta a ventas@saas-toi.com', 'info')}
              >
                🚀 Solicitar Upgrade de Plan
              </button>
            </div>

            {/* Real-time Progress Bar */}
            <div style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: '1.5rem', borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-inset)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                  Cupo de Abonados Consumidos
                </span>
                <span style={{ fontWeight: 800, color: subInfo.usagePercent >= 90 ? '#f43f5e' : 'var(--primary-accent)', fontSize: '0.95rem' }}>
                  {subInfo.currentSubscribers} / {subInfo.maxSubscribers} Abonados ({subInfo.usagePercent}%)
                </span>
              </div>

              <div style={{ width: '100%', height: '12px', backgroundColor: 'var(--border-color)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${subInfo.usagePercent}%`,
                    height: '100%',
                    backgroundColor: subInfo.usagePercent >= 90 ? '#f43f5e' : 'var(--primary-accent)',
                    borderRadius: 'var(--radius-full)',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>

              {subInfo.usagePercent >= 90 && (
                <div style={{ marginTop: '0.85rem', color: '#f43f5e', fontSize: '0.85rem', fontWeight: 700 }}>
                  ⚠️ Has alcanzado el {subInfo.usagePercent}% de tu capacidad. Solicita un upgrade a Plan Pro para no interrumpir la creación de abonados.
                </div>
              )}
            </div>
          </div>

          {/* SaaS Plans Matrix */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1.5rem' }}>
              Planes Disponibles para ISPs
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
              <div className="neu-card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>Free</h3>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--primary-accent)' }}>$0 <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/mes</span></div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.5rem 0 1rem 0' }}>Hasta 25 abonados</p>
                {subInfo.planSlug === 'free' && <span className="badge badge-info">Plan Actual</span>}
              </div>

              <div className="neu-card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>Starter</h3>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--primary-accent)' }}>$49 <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/mes</span></div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.5rem 0 1rem 0' }}>Hasta 300 abonados</p>
                {subInfo.planSlug === 'starter' && <span className="badge badge-info">Plan Actual</span>}
              </div>

              <div className="neu-card" style={{ border: '2px solid var(--primary-accent)', boxShadow: 'var(--shadow-button)', padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>Pro</h3>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--primary-accent)' }}>$99 <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/mes</span></div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.5rem 0 1rem 0' }}>Hasta 1,500 abonados</p>
                {subInfo.planSlug === 'pro' ? <span className="badge badge-info">Plan Actual</span> : <span className="badge badge-success">Recomendado</span>}
              </div>

              <div className="neu-card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>Enterprise</h3>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--primary-accent)' }}>$199 <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/mes</span></div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.5rem 0 1rem 0' }}>Abonados Ilimitados</p>
                {subInfo.planSlug === 'enterprise' && <span className="badge badge-info">Plan Actual</span>}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
