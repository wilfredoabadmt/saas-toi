'use client';

/**
 * src/components/waba/WabaConnectionPanel.tsx
 * ---------------------------------------------------------------------------
 * Client Component: Vista de Conexión WABA / WhatsApp App Review Console.
 *
 * Estructura del Layout:
 *   · SECCIÓN SUPERIOR: Layout en 2 Columnas
 *       - Columna Izquierda: ConnectBusinessLeftCard (1. Connect a business number + Permission Coverage + Recording Note)
 *       - Columna Derecha: CurrentConnectionCard (Current Connection + Refresh Data + Estados)
 *   · CANALES SOCIALES: MetaChannelsPanel (Facebook Pages & Instagram Direct)
 *   · CONSOLA DE PLANTILLAS: AppReviewConsole (Template Manager & Live Test Message)
 *   · DATOS DE WEBHOOK: WebhookInfoCard (Callback URL + Verify Token + 1-Click Copy)
 */

import React, { useState, useTransition } from 'react';
import { ConnectBusinessLeftCard } from './ConnectBusinessLeftCard';
import { CurrentConnectionCard } from './CurrentConnectionCard';
import { MetaChannelsPanel } from './MetaChannelsPanel';
import { AppReviewConsole } from './AppReviewConsole';
import { WebhookInfoCard } from './WebhookInfoCard';
import type { WhatsAppTemplateSummary } from '@/lib/waba/graph-client';
import { fetchLiveTemplatesAction } from '@/app/actions/waba.actions';

interface Props {
  initialWabaId?: string | null;
  initialPhoneNumberId?: string | null;
  initialDisplayPhone?: string | null;
  initialVerifiedName?: string | null;
  initialQualityRating?: string | null;
  initialVerificationStatus?: string | null;
  initialIsConnected: boolean;
  initialTemplates?: WhatsAppTemplateSummary[];
  callbackUrl: string;
  verifyToken: string;
  hasAppSecret?: boolean;
}

export function WabaConnectionPanel({
  initialWabaId,
  initialPhoneNumberId,
  initialDisplayPhone,
  initialVerifiedName,
  initialQualityRating,
  initialVerificationStatus,
  initialIsConnected,
  initialTemplates = [],
  callbackUrl,
  verifyToken,
  hasAppSecret = false,
}: Props) {
  const [isConnected, setIsConnected] = useState(initialIsConnected);
  const [wabaId] = useState(initialWabaId);
  const [phoneNumberId] = useState(initialPhoneNumberId);
  const [displayPhone] = useState(initialDisplayPhone);
  const [verifiedName] = useState(initialVerifiedName);
  const [qualityRating] = useState(initialQualityRating || 'GREEN');
  const [verificationStatus] = useState(initialVerificationStatus || 'VERIFIED');
  const [templates, setTemplates] = useState<WhatsAppTemplateSummary[]>(initialTemplates);

  const [isPending, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(async () => {
      const res = await fetchLiveTemplatesAction();
      if (res.ok) {
        setTemplates(res.templates);
      }
    });
  };

  const handleConnectSuccess = () => {
    setIsConnected(true);
    handleRefresh();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }}>
      {/* ------------------------------------------------------------------- */}
      {/* LAYOUT DE 2 COLUMNAS: STEP 1 (LEFT) & CURRENT CONNECTION (RIGHT)    */}
      {/* ------------------------------------------------------------------- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1.25rem', alignItems: 'stretch' }}>
        {/* Columna Izquierda */}
        <ConnectBusinessLeftCard onSuccess={handleConnectSuccess} />

        {/* Columna Derecha */}
        <CurrentConnectionCard
          isConnected={isConnected}
          isLoading={isPending}
          wabaId={wabaId}
          phoneNumberId={phoneNumberId}
          displayPhone={displayPhone}
          verifiedName={verifiedName}
          qualityRating={qualityRating}
          verificationStatus={verificationStatus}
          onRefresh={handleRefresh}
        />
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* CANALES SOCIALES: Facebook Pages & Instagram Direct                 */}
      {/* ------------------------------------------------------------------- */}
      <MetaChannelsPanel />

      {/* ------------------------------------------------------------------- */}
      {/* CONSOLA DE PLANTILLAS Y PRUEBAS LIVE DE META                        */}
      {/* ------------------------------------------------------------------- */}
      <AppReviewConsole
        wabaId={wabaId || undefined}
        phoneNumberId={phoneNumberId || undefined}
        displayPhone={displayPhone}
        isConnected={isConnected}
        initialTemplates={templates}
      />

      {/* ------------------------------------------------------------------- */}
      {/* DATOS DE WEBHOOK (INFORMATIVO PARA EL ADMIN)                       */}
      {/* ------------------------------------------------------------------- */}
      <WebhookInfoCard callbackUrl={callbackUrl} verifyToken={verifyToken} hasAppSecret={hasAppSecret} />
    </div>
  );
}
