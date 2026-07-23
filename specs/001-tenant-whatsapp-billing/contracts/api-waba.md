# API Contract: WABA (WhatsApp Business Account)

**Base Path**: `/api/waba`
**Auth**: Session cookie (admin del ISP autenticado)
**Tenant scope**: `organization_id` se obtiene de la sesión del usuario autenticado

---

## GET /api/waba/status

Obtiene el estado de conexión de WhatsApp del tenant.

**Response 200** (conectado):
```json
{
  "data": {
    "isConnected": true,
    "displayPhone": "+5491100001111",
    "wabaId": "123456789",
    "connectionStatus": "connected",
    "connectedAt": "2026-07-15T10:30:00Z"
  }
}
```

**Response 200** (no conectado):
```json
{
  "data": {
    "isConnected": false,
    "connectionStatus": "disconnected",
    "connectedAt": null
  }
}
```

**Nota de seguridad**: El token WABA (`encrypted_token`) NUNCA se incluye en esta
respuesta ni en ninguna otra respuesta al frontend.

---

## POST /api/waba/connect

Callback del flujo Embedded Signup. El frontend envía el code de autorización de Meta.

**Request Body**:
```json
{
  "code": "AQC...meta_auth_code..."
}
```

**Validation (Zod)**:
- `code`: string, min 10, required

**Backend flow**:
1. Intercambia `code` por token vía Graph API de Meta.
2. Obtiene WABA ID y Phone Number ID del token.
3. Cifra el token con AES-256-GCM.
4. Almacena en `waba_configs` (upsert: si ya existía, reemplaza).
5. Suscribe el WABA al webhook de la app vía Graph API.

**Response 200** (éxito):
```json
{
  "data": {
    "isConnected": true,
    "displayPhone": "+5491100001111",
    "connectionStatus": "connected",
    "connectedAt": "2026-07-23T01:30:00Z"
  }
}
```

**Response 400** (code inválido o expirado):
```json
{
  "error": "INVALID_AUTH_CODE",
  "message": "El código de autorización es inválido o ha expirado. Intente nuevamente."
}
```

**Response 502** (error comunicándose con Meta):
```json
{
  "error": "META_API_ERROR",
  "message": "No se pudo conectar con Meta. Intente nuevamente en unos minutos."
}
```

---

## POST /api/waba/disconnect

Desconecta el WABA del tenant (no revoca permisos en Meta, solo borra localmente).

**Response 200**:
```json
{
  "data": {
    "isConnected": false,
    "connectionStatus": "disconnected",
    "disconnectedAt": "2026-07-23T02:00:00Z"
  }
}
```
