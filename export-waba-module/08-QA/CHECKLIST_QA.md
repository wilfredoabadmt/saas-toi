# 08 — Checklist de QA

Ejecuta esto **después** de implantar y **antes** de dar el módulo por bueno.
Cada fase debe pasar entera antes de avanzar a la siguiente.

---

## Fase 1 — No hemos roto nada (regresión)

Lo primero es confirmar que SaaS TOI sigue funcionando igual que antes.

- [ ] `npm run build` compila sin errores nuevos
- [ ] `npm run lint` no añade errores nuevos
- [ ] `npx tsc --noEmit` limpio
- [ ] Login y navegación del dashboard funcionan
- [ ] La lista de **abonados** carga igual que antes
- [ ] La integración **MikroTik** sigue operando (corte/reconexión)
- [ ] Los **tickets** de soporte funcionan
- [ ] Los reportes que leen `message_logs` **no** se han roto por las columnas nuevas
- [ ] Los **cobros** y el módulo de facturación no han cambiado de comportamiento
- [ ] Ningún endpoint existente devuelve 500

```bash
# Ninguna de estas debe ser > 0
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM message_logs WHERE organization_id IS NULL;"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM waba_configs WHERE organization_id IS NULL;"
```

---

## Fase 2 — Aislamiento multi-tenant

**La fase más importante.** Un fallo aquí significa que la organización A puede
enviar mensajes con el número de la organización B.

Prepara dos organizaciones de prueba (A y B), cada una con su conexión WABA.

- [ ] Como usuario de A, `getWabaWorkspace()` devuelve **solo** el número de A
- [ ] Como usuario de A, `listRecentMessageEvents` **no** contiene eventos de B
- [ ] Como usuario de A, `disconnectWabaAction(<id de la conexión de B>)` **falla**
- [ ] Como usuario de A, `getMessageStatus(<wamid de B>)` devuelve `event: null`
- [ ] Sin sesión, toda Server Action devuelve `UNAUTHORIZED` (**nunca** datos)
- [ ] Un webhook con el `phone_number_id` de B escribe con `organization_id` de B
- [ ] Un usuario con rol no-admin no puede conectar ni desconectar un número

```sql
-- Debe devolver 0 filas. Si devuelve alguna, hay contaminación cruzada.
SELECT ml.id, ml.organization_id AS org_log, wc.organization_id AS org_config
FROM message_logs ml
JOIN waba_configs wc ON wc.id = ml.waba_config_id
WHERE ml.organization_id <> wc.organization_id;
```

- [ ] La consulta anterior devuelve **0 filas**

---

## Fase 3 — Seguridad

- [ ] `SELECT access_token_encrypted FROM waba_configs LIMIT 1` devuelve algo que
      **empieza por `v1:`** (no un token `EAAG…` legible)
- [ ] Webhook **sin** cabecera de firma → **401**
- [ ] Webhook con firma **incorrecta** → **401**
- [ ] Webhook con firma **correcta** → **200**
- [ ] `POST /api/waba/deauthorize` sin `signed_request` → **400** y **no borra nada**
- [ ] `POST /api/waba/deauthorize` con firma inválida → **401**
- [ ] Ningún log del servidor contiene el token ni el `code` de OAuth
- [ ] `META_WEBHOOK_ENFORCE_SIGNATURE` **no** está en `false` en producción
- [ ] Ninguna respuesta de API devuelve `accessTokenEncrypted`

```bash
# El token no debe aparecer en los logs
docker logs <contenedor> 2>&1 | grep -iE 'EAA[A-Za-z0-9]{20}' && echo "❌ FUGA" || echo "✅ limpio"
```

---

## Fase 4 — Flujo de conexión

- [ ] Sin conectar, el panel muestra el CTA de Embedded Signup
- [ ] El botón abre el popup de Meta
- [ ] Se completa login → permisos → negocio → número
- [ ] La conexión aparece en `waba_configs` con la `organization_id` correcta
- [ ] `display_phone_number` y `verified_name` se rellenan (no quedan NULL)
- [ ] `meta_user_id` queda guardado
- [ ] La respuesta trae `webhookSubscribed: true`
- [ ] Reconectar el **mismo** número actualiza la fila, no crea una segunda
- [ ] Desconectar y reconectar funciona

```sql
SELECT organization_id, waba_id, phone_number_id, display_phone_number,
       verified_name, connection_status, is_active,
       left(access_token_encrypted, 3) AS token_prefix
FROM waba_configs;
-- token_prefix debe ser 'v1:'
```

---

## Fase 5 — Plantillas

- [ ] `listTemplatesAction()` devuelve las plantillas reales de Meta
- [ ] `createTemplateAction()` con `{{1}}` al inicio → **rechaza** con mensaje claro
- [ ] Con `{{1}} {{2}}` adyacentes → **rechaza**
- [ ] Con `{{2}}` sin `{{1}}` → **rechaza**
- [ ] Con idioma `español` (en vez de `es`) → **rechaza**
- [ ] Una plantilla válida se crea y aparece en Meta como PENDING
- [ ] `createIspPresetTemplatesAction()` crea las 4 y omite las existentes
- [ ] Un nombre duplicado se detecta antes de llamar a Meta

---

## Fase 6 — Envío y webhook (circuito completo)

- [ ] Enviar una plantilla APPROVED a un número real → llega a WhatsApp
- [ ] Se crea una fila en `message_logs` con `status = 'accepted'`
- [ ] En segundos, el webhook la actualiza a `sent` y luego a `delivered`
- [ ] Al leer el mensaje en el teléfono → pasa a `read`
- [ ] **La fila es siempre la misma** (upsert, no cuatro filas distintas)
- [ ] Enviar a un número sin WhatsApp → error claro, no un 500
- [ ] Enviar con un nº de parámetros incorrecto → se detecta antes de llamar a Meta
- [ ] Responder desde el teléfono crea una fila `direction = 'inbound'`
- [ ] El mensaje entrante queda enlazado al `subscriber_id` correcto

```sql
-- Debe haber UNA fila por wamid, con el último estado.
SELECT message_id, direction, status, recipient_phone, last_event_at
FROM message_logs
WHERE channel = 'whatsapp'
ORDER BY last_event_at DESC LIMIT 10;

-- Debe devolver 0: si no, falta el índice de idempotencia.
SELECT message_id, COUNT(*) FROM message_logs
WHERE message_id IS NOT NULL
GROUP BY message_id HAVING COUNT(*) > 1;
```

---

## Fase 7 — Manejo de fallos

- [ ] Con un token corrupto, la página muestra "requiere atención", **no** un 500
- [ ] `connection_status` pasa a `error` y `last_error` explica el motivo
- [ ] Un webhook de un `phone_number_id` desconocido va a `waba_webhook_deadletter`
- [ ] `waba_webhook_deadletter` está vacío en operación normal
- [ ] Sin `WABA_ENCRYPTION_KEY`, el panel dice "módulo no configurado"
- [ ] Meta caído (timeout) → la página carga con los datos locales
- [ ] Texto libre fuera de la ventana de 24 h → mensaje explicativo, no error crudo

```sql
SELECT reason, COUNT(*), MAX(received_at)
FROM waba_webhook_deadletter WHERE processed_at IS NULL
GROUP BY reason;
```

---

## Fase 8 — Rendimiento

- [ ] `getWabaWorkspace()` responde en < 2 s (hace 2 llamadas a Meta)
- [ ] El webhook responde en < 1 s
- [ ] Un envío masivo de 50 destinatarios completa sin timeout
- [ ] Los índices se están usando:

```sql
EXPLAIN ANALYZE SELECT * FROM message_logs
WHERE organization_id = '<uuid>' AND channel = 'whatsapp'
ORDER BY last_event_at DESC LIMIT 50;
-- Debe usar message_logs_org_config_event_idx, no Seq Scan

EXPLAIN ANALYZE SELECT * FROM waba_configs WHERE phone_number_id = '123456';
-- Debe usar waba_configs_phone_number_id_idx
```

---

## Fase 9 — Cumplimiento (Meta)

- [ ] Existe una página pública de política de privacidad
- [ ] Existe una página pública de condiciones del servicio
- [ ] Existe un formulario público de solicitud de borrado de datos
- [ ] El callback de deauthorize purga de verdad los datos
- [ ] `subscribers.whatsapp_opt_in` se rellena cuando el abonado consiente
- [ ] Los envíos masivos filtran por `whatsapp_opt_in = true`
- [ ] Se puede demostrar cómo y cuándo se obtuvo el consentimiento

---

## Criterio de aceptación

| Fase | Bloqueante para… |
|---|---|
| 1. Regresión | desplegar en producción |
| 2. Multi-tenant | **cualquier despliegue** |
| 3. Seguridad | **cualquier despliegue** |
| 4–6. Funcionalidad | dar el módulo por completo |
| 7–8. Robustez | operación con clientes reales |
| 9. Cumplimiento | solicitar App Review |

**Las fases 2 y 3 no admiten excepciones.** Un fallo ahí no es un bug: es una
fuga de datos entre empresas clientes.
