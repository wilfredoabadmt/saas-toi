# 08 — Guía de App Review de Meta

Adaptación del `META_APP_REVIEW.md` del origen, que documenta un **rechazo real**
y lo que hubo que corregir. Aprovecha esa experiencia.

---

## Por qué rechazan (el caso real del origen)

Meta **no** rechazó el caso de uso. Rechazó las **pruebas**. El revisor dijo que
el screencast no mostraba:

- el flujo completo de login de Meta,
- al usuario concediendo los permisos,
- la experiencia completa dentro del producto para cada permiso.

**Conclusión operativa:** el vídeo importa tanto como el código.

---

## Requisitos previos (todos, sin excepción)

- [ ] App desplegada en producción y accesible públicamente
- [ ] **Dominio propio** (no `sslip.io` — ver `00-AUDITORIA/AUDITORIA_PREVIA.md` §C)
- [ ] Negocio verificado en Business Manager (NIT 305020028)
- [ ] Al menos **una plantilla APPROVED** en la WABA conectada
- [ ] Número emisor completamente registrado (no "Pendiente")
- [ ] Un teléfono destinatario real que pueda recibir mensajes
- [ ] Webhook verificado y recibiendo eventos
- [ ] URLs de deauthorize y borrado de datos registradas y funcionando
- [ ] Páginas de privacidad y condiciones publicadas
- [ ] Checklist de QA, fases 1–9, completo

---

## Ruta dedicada para la revisión

Crea `/dashboard/review` (como hizo el origen). No es la UX final: es una
pantalla **lineal** que demuestra el flujo en orden, para que el revisor no se
pierda entre los módulos de MikroTik, tickets y cobranza.

Debe contener, en este orden:

1. Botón de Embedded Signup
2. Datos del número conectado, **leídos de Meta en vivo**
3. Lista de plantillas, **leída de Meta en vivo**
4. Formulario de envío de una plantilla real
5. Estado de entrega actualizado por el webhook

Y **no** debe contener herramientas internas de depuración: registro manual del
número, verificadores de webhook, volcados de estado. En el origen ocupaban
media pantalla y solo generan preguntas.

---

## Guion del screencast

Graba con la interfaz **en inglés** o con subtítulos en inglés. Narra cada paso.

```
00:00  "SaaS TOI is a billing and operations platform for internet service
        providers in Bolivia. ISPs use it to notify subscribers about
        payments through their own WhatsApp Business number."

00:15  Abrir /dashboard/review con sesión iniciada. Mostrar que no hay número
       conectado todavía.

00:25  Pulsar "Connect WhatsApp Business".
       ⚠️ GRABAR EL POPUP DE META COMPLETO — esto es lo que faltaba en el
          rechazo del origen:
          · pantalla de login de Facebook
          · pantalla de concesión de permisos (que se lean los permisos)
          · selección del Business
          · selección o creación del número

01:30  Volver a la app. Mostrar el número ya conectado.
       "The app is now reading the phone number profile and the approved
        message templates directly from Meta using
        whatsapp_business_management."
       Señalar en pantalla: número, nombre verificado, calidad, plantillas.

02:00  Ir a la sección de plantillas. Mostrar la lista real con sus estados.

02:20  "Now I will send a real payment reminder using
        whatsapp_business_messaging."
       Rellenar: destinatario, plantilla aprobada, variables. Enviar.

02:40  Mostrar el estado en la app: accepted → delivered.

02:50  ⚠️ GRABAR EL TELÉFONO DESTINATARIO recibiendo el mensaje.
       Es obligatorio. Sin esto, rechazo casi seguro.

03:10  "whatsapp_business_management is used to onboard the business number
        and read its WhatsApp assets. whatsapp_business_messaging is used to
        send approved reminder templates to opted-in subscribers."
```

Duración objetivo: 3–4 minutos. Sin cortes en el flujo de Meta.

---

## Notas para el formulario de App Review

**Resumen del caso de uso** (pegar tal cual, ajustando lo que proceda):

> SaaS TOI is a multi-tenant billing and operations platform for internet
> service providers in Bolivia. ISPs manage their subscribers, invoices and
> network equipment in our platform. Each ISP connects its own WhatsApp
> Business number through Meta Embedded Signup and uses it to send payment
> reminders, service suspension notices and payment confirmations to its own
> subscribers, who have explicitly opted in to receive WhatsApp notifications
> as part of their service contract.

**`whatsapp_business_management`:**

> Used to onboard the ISP's WhatsApp Business Account through Embedded Signup,
> and to read the connected phone number profile (display number, verified
> name, quality rating, verification status) and the list of approved message
> templates. This lets the ISP manage its reminder operations inside SaaS TOI
> without switching to WhatsApp Manager. We also use it to subscribe our app
> to the WABA so we can receive message status webhooks.

**`whatsapp_business_messaging`:**

> Used to send approved utility templates from the ISP's own connected phone
> number to its opted-in subscribers: payment reminders before the due date,
> suspension notices for overdue accounts, and payment confirmations. We also
> use it to reply to subscriber-initiated conversations within the 24-hour
> customer service window, through our multi-agent Chat Inbox.

**Si preguntan por la autenticación:**

> The app uses Meta Embedded Signup on the frontend. The authorization code
> returned by the popup is exchanged on our backend for a long-lived
> business-scoped token, which is stored encrypted with AES-256-GCM and scoped
> to the ISP's organization in our multi-tenant database. The full frontend
> login and permission grant flow is shown in the screencast.

**Si preguntan por el opt-in:**

> Subscribers accept WhatsApp notifications when signing their service
> contract with the ISP, and the consent is recorded per subscriber with a
> timestamp and source in our database. Bulk sends filter strictly on that
> opt-in flag. Subscribers can opt out by replying to any message, and the ISP
> can disable notifications from the subscriber's record.

---

## Errores que garantizan el rechazo

| Error | Por qué |
|---|---|
| Vídeo sin el popup completo de Meta | **El motivo exacto del rechazo del origen** |
| No mostrar el teléfono receptor | El revisor no puede verificar el envío |
| Pantallas mockeadas o con datos falsos | Se lee como que no usas los permisos |
| Notas vagas ("gestionamos activos de WhatsApp") | Meta pide precisión |
| Entorno roto en producción | Meta no depura por ti |
| Número aún "Pendiente" en Meta | No se puede enviar nada |
| Sin plantilla aprobada | No hay nada que demostrar |
| Consola de debug visible | Genera preguntas y desconfianza |

---

## Antes de enviar

- [ ] Vídeo grabado, con el popup de Meta íntegro
- [ ] Vídeo muestra el teléfono receptor
- [ ] Vídeo en inglés o subtitulado
- [ ] Notas escritas para cada permiso
- [ ] Ruta `/dashboard/review` limpia de herramientas de debug
- [ ] Credenciales de una cuenta de prueba en el formulario
- [ ] Instrucciones paso a paso para el revisor
- [ ] Producción funcionando **ahora mismo** (compruébalo antes de darle a enviar)

---

## Referencias del origen

- `META_APP_REVIEW.md` — el post-mortem del rechazo real
- `docs/BLUEPRINT_WHATSAPP_SAAS_TECH_PROVIDER_V1.md` — 267 líneas sobre validar
  un SaaS de WhatsApp como Tech Provider, escritas desde los problemas
  concretos que aparecieron al construir el módulo. Léelo entero antes de
  solicitar la revisión.
