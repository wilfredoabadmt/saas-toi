'use client';

import React, { useState } from 'react';

interface DeletionResponse {
  confirmation_code: string;
  url: string;
  status: string;
  message: string;
  timestamp: string;
}

export function DataDeletionForm() {
  const [email, setEmail] = useState('');
  const [phoneOrWabaId, setPhoneOrWabaId] = useState('');
  const [reason, setReason] = useState('Desvinculación de aplicación de WhatsApp / Revocación de permisos Meta');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<DeletionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Por favor ingrese un correo electrónico válido.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/data-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phoneOrWabaId, reason }),
      });

      if (!res.ok) {
        throw new Error('Error al procesar la solicitud en el servidor.');
      }

      const data: DeletionResponse = await res.json();
      setResult(data);
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : 'Ocurrió un error al enviar la solicitud.';
      setError(errMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyConfirmationCode = () => {
    if (result?.confirmation_code) {
      navigator.clipboard.writeText(result.confirmation_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="w-full rounded-3xl bg-[#0F1218]/90 border border-white/[0.08] backdrop-blur-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
      {/* Background Accent Glow */}
      <div className="absolute -top-24 -right-24 w-60 h-60 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 font-bold text-lg">
          🗑️
        </div>
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight">
            Formulario de Solicitud de Supresión de Datos (Data Purge Request)
          </h3>
          <p className="text-xs text-slate-400">
            Mecanismo interactivo para clientes de ISP y usuarios de WhatsApp Cloud API
          </p>
        </div>
      </div>

      {!result ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
              ⚠️ {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Correo Electrónico de Contacto del ISP / Usuario <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@isp-telecom.com"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              WABA ID o Número de Teléfono WhatsApp (Opcional)
            </label>
            <input
              type="text"
              value={phoneOrWabaId}
              onChange={(e) => setPhoneOrWabaId(e.target.value)}
              placeholder="WABA ID: 10928374650... o +52 55 1234 5678"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Motivo de la Solicitud
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs tracking-wider uppercase transition-all duration-300 shadow-lg shadow-red-600/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Procesando Solicitud Segura...</span>
                </>
              ) : (
                <>
                  <span>Enviar Solicitud y Emitir Comprobante Meta</span>
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* Visual Confirmation Receipt Ticket */
        <div className="space-y-5 animate-fadeIn">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-base">
              ✓
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-300">
                Solicitud de Supresión Registrada Exitosamente
              </div>
              <div className="text-[11px] text-emerald-400/80">
                Comprobante emitido de acuerdo a los estándares de Meta Graph API Data Deletion Callback.
              </div>
            </div>
          </div>

          {/* Ticket Card */}
          <div className="p-5 rounded-2xl bg-black/60 border border-white/[0.1] space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <span className="text-xs text-slate-400 font-medium">Código de Confirmación Meta:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-extrabold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/30">
                  {result.confirmation_code}
                </span>
                <button
                  type="button"
                  onClick={copyConfirmationCode}
                  className="px-2.5 py-1 text-[11px] rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-slate-300 transition-colors cursor-pointer"
                >
                  {copied ? '¡Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Correo Registrado:</span>
                <span className="text-slate-200 font-medium">{email}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Identificador Objetivo:</span>
                <span className="text-slate-200 font-medium">{phoneOrWabaId || 'No especificado'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Estado del Borrado:</span>
                <span className="text-amber-400 font-semibold">{result.status} (Máx. 30 días)</span>
              </div>
              <div>
                <span className="text-slate-500 block">Fecha y Hora de Registro:</span>
                <span className="text-slate-300 font-mono text-[11px]">
                  {new Date(result.timestamp).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-white/[0.06] text-[11px] text-slate-400">
              <p>
                <strong>URL de Seguimiento de Callback:</strong>{' '}
                <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline break-all">
                  {result.url}
                </a>
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setEmail('');
                setPhoneOrWabaId('');
              }}
              className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
            >
              Registrar otra solicitud
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
