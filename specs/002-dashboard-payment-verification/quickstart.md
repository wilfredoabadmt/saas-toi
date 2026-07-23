# Quickstart: 002-dashboard-payment-verification

**Feature**: [spec.md](spec.md) | [plan.md](plan.md) | [data-model.md](data-model.md)

Guía para levantar, verificar y hacer el self-test E2E de esta feature. Asume el entorno
del feature 001 ya funcionando (Next.js + PostgreSQL + S3 + WABA de sandbox).

## 1. Migración de base de datos

```bash
# Genera y aplica la migración incremental (amount, sender_phone, subscriber_id nullable, timezone)
npm run db:generate
npm run db:migrate      # o vía ensureMigrationsRun en runtime / prestart
```

Verifica en la BD que `payment_proofs` tenga `amount`, `sender_phone` y `subscriber_id`
nullable, y que `organizations` tenga `timezone`.

## 2. Templates UTILITY en Meta (dependencia externa)

Crear y **enviar a aprobación** en el WhatsApp Manager del ISP:
- `payment_confirmation` (UTILITY) — confirma el pago aprobado.
- `payment_correction` (UTILITY) — pide corregir/reenviar; parámetro con el motivo.

> Pendiente de aprobación de Meta = único paso delegable a un tercero (Principio VI/X).
> Para el self-test local se usa el número/allowlist de sandbox.

## 3. Levantar la app

```bash
npm run dev        # http://localhost:3000
```

Rutas nuevas:
- `/dashboard` — indicadores ejecutivos.
- `/payments/verify` — bandeja de verificación.

## 4. Gate técnico (Definición de Hecho, piso)

```bash
npm run typecheck      # tsc strict + noUncheckedIndexedAccess
npm run lint
npm run build
npm run test           # Vitest unit + integration
```

Debe incluir en verde: `dashboard.service.test.ts` (cálculo de métricas + boundary de
mes/timezone), `payment-proof.review.test.ts` (idempotencia + efecto en abonado),
`dashboard.test.ts` y `payment-verification.test.ts` (aislamiento tenant).

## 5. Self-test E2E de comportamiento (Principio VI) — camino feliz

1. **Simular recepción**: enviar al webhook (o vía el flujo de sandbox) un mensaje con
   imagen desde el teléfono de un abonado en `overdue`.
2. Abrir `/payments/verify` → el comprobante aparece (en ≤ 30 s por polling o al
   refrescar, SC-004) con el visor y los datos del abonado.
3. Clic en **Aprobar**, confirmar `amount` → verificar:
   - comprobante `approved`, `amount` guardado, `reviewed_by/at` seteados;
   - abonado `payment_status = current` y `due_date` +1 mes;
   - se despacha `payment_confirmation` al abonado (observar en el canal de sandbox);
   - `/dashboard` refleja +monto en "Total recaudado", −1 en "Abonados en mora" y
     "Comprobantes pendientes".

## 6. Self-test E2E — caminos infelices

- **Rechazo sin motivo**: intentar rechazar sin `reason` → la UI/endpoint lo bloquea
  (`400`), no transiciona (FR-013/SC-007).
- **Rechazo con motivo**: rechazar con motivo → comprobante `rejected`, abonado SIN
  cambio de estado, se despacha `payment_correction`.
- **Fallo de Meta**: forzar fallo del envío (token inválido/sandbox caído) al aprobar →
  la aprobación y el update del abonado se conservan; respuesta `notified=false`; la UI
  informa "notificación pendiente" (FR-010/SC-006).
- **Opt-out**: aprobar comprobante de un abonado con `opted_out_whatsapp=true` → se
  aplica el negocio pero NO se envía; la UI indica que no se notificó por opt-out.
- **Abonado no identificado**: simular comprobante desde un número no registrado →
  aparece como "abonado no identificado" con `senderPhone`; asociarlo a un abonado vía
  el panel → luego aprobar normal (FR-021).
- **Doble aprobación / concurrencia**: aprobar dos veces (o dos operadores) → la segunda
  recibe `409`, sin reenvío ni doble efecto (D4).
- **Aislamiento tenant**: con dos organizaciones, confirmar que cada bandeja/dashboard
  muestra solo lo suyo (SC-002).

## 7. Loop de auto-corrección

Si algún paso falla: diagnosticar (logs del service, `delivery_status`/`failure_reason`
del `message_log`, respuesta cruda de Meta), corregir y **re-verificar** hasta verde.
Local primero (con túnel para el webhook si aplica), nube después.
