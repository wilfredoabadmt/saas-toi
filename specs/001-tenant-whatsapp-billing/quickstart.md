# Quickstart: 001-tenant-whatsapp-billing

**Feature**: Gestión Multi-Tenant de Abonados, Conexión Meta WhatsApp Cloud API y
Envío de Recordatorios de Cobranza (Utility)

## Prerequisites

1. **Node.js** 20+ y **pnpm** instalados.
2. **PostgreSQL** corriendo (local o Docker).
3. **Cuenta de desarrollador de Meta** con una Meta App configurada:
   - Permisos: `whatsapp_business_management`, `whatsapp_business_messaging`
   - Webhook configurado apuntando a la URL pública (ngrok para local)
4. **Bucket S3-compatible** (Cloudflare R2, AWS S3, MinIO) con credenciales.

## Environment Setup

Copia `.env.example` a `.env` y rellena:

```bash
# Base de datos
DATABASE_URL=postgres://user:pass@localhost:5432/saas_toi

# Cifrado de tokens WABA (generar con: openssl rand -hex 32)
ENCRYPTION_KEY=<32_bytes_hex>

# Meta WhatsApp Cloud API
META_APP_ID=<tu_meta_app_id>
META_APP_SECRET=<tu_meta_app_secret>
WEBHOOK_VERIFY_TOKEN=<un_string_secreto_aleatorio>

# S3-compatible storage
S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=<key>
S3_SECRET_ACCESS_KEY=<secret>
S3_BUCKET_NAME=saas-toi-files

# URL pública (para Embedded Signup callback)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Install & Run

```bash
# Instalar dependencias
pnpm install

# Ejecutar migraciones
pnpm db:migrate

# Iniciar en desarrollo
pnpm dev
```

El panel estará en `http://localhost:3000`.

## Verify the Feature

### 1. Crear un ISP y un usuario admin

Registra una organización (ISP) y un usuario admin desde la UI de registro o
sembrando la DB directamente.

### 2. Importar abonados

1. Ve a **Abonados → Importar CSV**.
2. Sube un CSV con formato:
   ```
   nombre,telefono,plan,monto,fecha_vencimiento
   Juan Pérez,+5491155551234,Fibra 50 Mbps,15000,2026-08-01
   María García,+5491155555678,Fibra 100 Mbps,22000,2026-07-25
   ```
3. Verifica que los abonados aparecen en la lista con su estado de pago calculado.

### 3. Conectar WhatsApp Business

1. Ve a **WhatsApp → Conectar**.
2. Haz clic en "Conectar WhatsApp Business".
3. Completa el flujo Embedded Signup en la ventana de Meta.
4. Verifica que el estado cambia a "Conectado" con tu número.

### 4. Enviar un recordatorio de pago

1. Ve a **Mensajería → Enviar recordatorio**.
2. Selecciona los abonados vencidos.
3. Elige el template "payment_reminder".
4. Haz clic en "Enviar".
5. Verifica el estado de entrega en el log de mensajes.

### 5. Simular recepción de comprobante (webhook)

Para probar localmente con ngrok:

```bash
# Iniciar ngrok apuntando al puerto de dev
ngrok http 3000

# En Meta App Dashboard:
# Webhook URL: https://<ngrok-id>.ngrok.io/api/webhooks/whatsapp
# Verify Token: el valor de WEBHOOK_VERIFY_TOKEN
```

Envía una imagen desde un número de WhatsApp registrado como abonado. Verifica:
- El comprobante aparece en el panel bajo el expediente del abonado.
- El webhook no duplica el registro si Meta lo reenvía.

## Testing

```bash
# Tests unitarios
pnpm test

# Tests de integración (requiere DB)
pnpm test:integration

# Type check
pnpm typecheck

# Lint
pnpm lint

# Build de producción
pnpm build
```

## Tenant Isolation Verification

Para verificar el aislamiento multi-tenant:

1. Crea un segundo ISP (organización B).
2. Importa abonados distintos en cada ISP.
3. Inicia sesión como admin de ISP-A: solo debe ver abonados de A.
4. Inicia sesión como admin de ISP-B: solo debe ver abonados de B.
5. Verifica que las APIs nunca retornan datos cruzados.
