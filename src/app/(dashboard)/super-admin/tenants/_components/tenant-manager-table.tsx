'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface TenantSubscription {
  id: string;
  status: string;
  planId?: string | null;
  expiresAt?: string | Date | null;
  trialEndsAt?: string | Date | null;
  plan?: {
    id: string;
    name: string;
    slug: string;
    maxSubscribers?: number | null;
    maxRouters?: number | null;
    priceMonthlyUSD?: string | number | null;
  } | null;
}

export interface TenantItem {
  id: string;
  name: string;
  slug: string;
  status: string;
  currency?: string | null;
  createdAt: string | Date;
  subscription?: TenantSubscription | null;
}

export interface SaaSPlanOption {
  id: string;
  name: string;
  slug: string;
  maxSubscribers?: number | null;
  maxRouters?: number | null;
  priceMonthlyUSD?: string | number | null;
}

export function TenantManagerTable({ initialTenants }: { initialTenants: TenantItem[] }) {
  const router = useRouter();
  const [tenants, setTenants] = useState<TenantItem[]>(initialTenants);
  const [saasPlans, setSaasPlans] = useState<SaaSPlanOption[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  // Selected Tenant for Subscription Modal
  const [selectedTenant, setSelectedTenant] = useState<TenantItem | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('active');
  const [extendDays, setExtendDays] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Search & Status filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoadingPlans(true);
        const res = await fetch('/api/saas-plans');
        const json = await res.json();
        if (json.success && json.data) {
          setSaasPlans(json.data);
        }
      } catch (err) {
        console.error('Error fetching SaaS plans:', err);
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchPlans();
  }, []);

  const openManageModal = (tenant: TenantItem) => {
    setSelectedTenant(tenant);
    setSelectedPlanId(tenant.subscription?.plan?.id || tenant.subscription?.planId || (saasPlans[0]?.id || ''));
    setSelectedStatus(tenant.status || 'active');
    setExtendDays(0);
    setModalOpen(true);
  };

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;

    try {
      setIsSaving(true);
      const res = await fetch(`/api/super-admin/tenants/${selectedTenant.id}/subscription`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlanId || undefined,
          status: selectedStatus,
          extendDays: extendDays > 0 ? extendDays : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error al actualizar suscripción');

      // Refresh list
      router.refresh();
      setModalOpen(false);
      setSelectedTenant(null);

      // Update local state for immediate feedback
      setTenants((prev) =>
        prev.map((t) => {
          if (t.id === selectedTenant.id) {
            const newPlan = saasPlans.find((p) => p.id === selectedPlanId) || t.subscription?.plan;
            return {
              ...t,
              status: selectedStatus,
              subscription: {
                ...t.subscription,
                id: t.subscription?.id || 'new-sub',
                status: selectedStatus,
                planId: selectedPlanId,
                plan: newPlan ? { ...newPlan } : null,
              },
            };
          }
          return t;
        })
      );
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickStatusChange = async (tenantId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/super-admin/tenants/${tenantId}/subscription`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('No se pudo cambiar el estado');

      setTenants((prev) =>
        prev.map((t) => (t.id === tenantId ? { ...t, status: newStatus } : t))
      );
      router.refresh();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Buscar por nombre o slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-72 px-3.5 py-2 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Todas ({tenants.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Activas ({tenants.filter((t) => t.status === 'active').length})
          </button>
          <button
            onClick={() => setStatusFilter('trialing')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'trialing'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Prueba / Trial ({tenants.filter((t) => t.status === 'trialing').length})
          </button>
          <button
            onClick={() => setStatusFilter('suspended')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'suspended'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Suspendidas ({tenants.filter((t) => t.status === 'suspended').length})
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <th className="px-5 py-3.5">Empresa ISP</th>
                <th className="px-5 py-3.5">Slug / URL</th>
                <th className="px-5 py-3.5">Estado Servicio</th>
                <th className="px-5 py-3.5">Plan SaaS Contratado</th>
                <th className="px-5 py-3.5">Límites Plan</th>
                <th className="px-5 py-3.5">Fecha Registro</th>
                <th className="px-5 py-3.5 text-right">Acciones de Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60 font-medium text-slate-800 dark:text-slate-200">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-500 dark:text-slate-400">
                    No se encontraron empresas ISP con los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                filteredTenants.map((t) => {
                  const planObj = t.subscription?.plan;
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-sm shrink-0 border border-indigo-500/20">
                            {t.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-slate-900 dark:text-white font-bold">{t.name}</div>
                            <div className="text-[11px] text-slate-400 font-normal">ID: {t.id.slice(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <code className="text-xs font-mono bg-slate-100 dark:bg-slate-900 text-indigo-600 dark:text-indigo-300 px-2 py-1 rounded border border-indigo-500/10">
                          {t.slug}
                        </code>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full border ${
                            t.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : t.status === 'trialing'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              t.status === 'active'
                                ? 'bg-emerald-500'
                                : t.status === 'trialing'
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                          ></span>
                          {t.status === 'active' ? 'Activo' : t.status === 'trialing' ? 'Prueba (Trial)' : t.status === 'suspended' ? 'Suspendido' : t.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {planObj?.name || 'Starter (Demo)'}
                          </span>
                          <span className="text-xs text-indigo-400 font-semibold">
                            ${planObj?.priceMonthlyUSD ? Number(planObj.priceMonthlyUSD) : 0} USD/mes
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500 dark:text-slate-400">
                        <div>
                          👥 Max Clients: <strong className="text-slate-700 dark:text-slate-200">{planObj?.maxSubscribers || 300}</strong>
                        </div>
                        <div>
                          🔌 Routers: <strong className="text-slate-700 dark:text-slate-200">{planObj?.maxRouters || 1}</strong>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500 dark:text-slate-400">
                        {new Date(t.createdAt).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openManageModal(t)}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1"
                          >
                            <span>💳</span>
                            <span>Cambiar Plan</span>
                          </button>

                          {t.status === 'active' ? (
                            <button
                              onClick={() => handleQuickStatusChange(t.id, 'suspended')}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-semibold border border-rose-500/20 transition-all active:scale-95"
                              title="Suspender acceso al ISP"
                            >
                              Suspender
                            </button>
                          ) : (
                            <button
                              onClick={() => handleQuickStatusChange(t.id, 'active')}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-xs font-semibold border border-emerald-500/20 transition-all active:scale-95"
                              title="Activar acceso al ISP"
                            >
                              Activar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SUBSCRIPTION MANAGEMENT MODAL */}
      {modalOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl text-slate-100 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Gestionar Suscripción SaaS</h3>
                <p className="text-xs text-slate-400 mt-0.5">Empresa: <strong className="text-indigo-400">{selectedTenant.name}</strong></p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSubscription} className="space-y-4">
              {/* Select Plan */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Plan SaaS Contratado
                </label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {saasPlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ${Number(p.priceMonthlyUSD)} USD/mes (Max Clients: {p.maxSubscribers || 'Ilimitados'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Status */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Estado del Servicio
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="active">🟢 Activo (Servicio habilitado)</option>
                  <option value="trialing">🟡 Período de Prueba (Trial)</option>
                  <option value="suspended">🔴 Suspendido (Acceso restringido por falta de pago)</option>
                  <option value="canceled">⚪ Cancelado</option>
                </select>
              </div>

              {/* Extend Trial */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Extender Días de Prueba (Opcional)
                </label>
                <input
                  type="number"
                  placeholder="Ej: 15 días adicionales"
                  value={extendDays || ''}
                  onChange={(e) => setExtendDays(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Guardando...' : 'Aplicar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
