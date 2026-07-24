# Feature Specification: 006-landing-and-self-onboarding

**Feature**: Landing Page Comercial Pública (/) y Flujo de Registro Autónomo de Tenants (Onboarding Wizard)

**Scope**:
- **IN SCOPE**:
  - Landing Page pública comercial en la raíz `/` con diseño oscuro premium, responsivo y dinámico:
    - **Hero Section**: Título impactante, propuesta de valor para ISPs, CTA de "Comenzar Prueba Gratuita" y screenshot/mockup del panel.
    - **Problema / Solución**: Pérdida de cartera por falta de cobranza automatizada vs. Solución SaaS TOI.
    - **Módulos Destacados**: WhatsApp Cloud API, Corte/Reconexión MikroTik y Tickets de Soporte.
    - **Planes & Precios**: Tarjetas de precios transparentes (Start, Pro, Enterprise).
    - **FAQ**: Preguntas frecuentes desplegables.
  - Formulario de Registro Autónomo en `/register`:
    - Creación transaccional de la entidad `organization` (Tenant) y del primer usuario `admin` con contraseña hasheada de manera segura.
    - Inicio de sesión automático tras completar el registro.
  - Asistente de Inicio / Onboarding Wizard en `/onboarding`:
    - Checklist guiada de 3 pasos:
      1. Paso 1: Configurar datos y zona horaria del ISP.
      2. Paso 2: Cargar el primer lote de abonados vía CSV.
      3. Paso 3: Conectar la cuenta de WhatsApp Business WABA.
- **OUT OF SCOPE**:
  - Pasarela de cobro por tarjeta de crédito integrada en la pantalla de registro (el registro activa un período de prueba gratuito inmediato).

---

## User Stories

### US1 — Landing Page Comercial Pública (`/`) (Priority: P1)
**Como** Visitante o Dueño de ISP  
**Quiero** ver una Landing Page comercial en la raíz (`/`) con la propuesta de valor y características de la plataforma  
**Para** evaluar las ventajas de automatizar la cobranza y soporte de mi ISP antes de registrarme.

#### Criterios de Aceptación:
- Al acceder a `/` sin autenticación, se renderiza la Landing Page comercial con navegación pública (Características, Precios, FAQ, Iniciar Sesión, Registro).
- Diseño responsivo compatible con dispositivos móviles y escritorio.
- El botón "Comenzar Prueba Gratuita" redirige al formulario de registro en `/register`.

---

### US2 — Registro Autónomo de Tenant (`/register`) (Priority: P1)
**Como** Nuevo Cliente (Dueño de ISP)  
**Quiero** registrar mi ISP ingresando el Nombre de la Empresa, Nombre del Administrador, Email y Contraseña  
**Para** instanciar mi propio entorno multi-tenant de forma autónoma.

#### Criterios de Aceptación:
- El formulario solicita: Nombre del ISP, Nombre del Administrador, Email de Acceso y Contraseña (mínimo 6 caracteres).
- El sistema crea la nueva `organization` y el usuario `admin` asociado.
- Las contraseñas se almacenan con hash seguro (sha256/bcrypt).
- Al completar el registro, el sistema genera la sesión autenticada y redirige al asistente `/onboarding`.

---

### US3 — Asistente de Inicio (Onboarding Wizard) (`/onboarding`) (Priority: P1)
**Como** Administrador de un ISP recién registrado  
**Quiero** ser guiado paso a paso en el asistente de inicio `/onboarding`  
**Para** completar la configuración inicial de mi plataforma de forma rápida.

#### Criterios de Aceptación:
- El wizard muestra una barra de progreso con 3 hitos clave:
  - **Paso 1**: Datos del ISP & Moneda local.
  - **Paso 2**: Importar Cartera de Abonados (conlace rápido a `/subscribers/import`).
  - **Paso 3**: Conexión WABA (conlace rápido a `/whatsapp`).
- Un indicador muestra el porcentaje completado (0%, 33%, 66%, 100%).
- Botón para "Ir al Dashboard Principal" disponible cuando los pasos básicos estén listos.

---

## Constitution Compliance Audit

| Principio Constitucional | Mecanismo de Cumplimiento en Feature 006 |
|---|---|
| **I. Multi-Tenancy Absoluto** | Creación de un nuevo UUID de `organization` asignado de forma exclusiva al usuario registrado. |
| **II. Seguridad de Contraseñas** | Hashing seguro de contraseñas de usuario en reposo (`password_hash`). |
| **III. Experiencia de Usuario** | Diseño visual premium (Vanilla CSS con gradientes oscuros y micro-animaciones) acorde a los estándares del proyecto. |
| **IV. Calidad Verificable** | Pruebas automáticas para el endpoint `/api/register` y renderizado de la Landing Page. |

---

## Data Model Extensions & API Contracts

### 1. `POST /api/register`
- **Descripción**: Registra una nueva organización e instanciar al usuario Administrador.
- **Body**:
  ```json
  {
    "companyName": "FiberSpeed ISP",
    "name": "Roberto Morales",
    "email": "admin@fiberspeed.com",
    "password": "SecretPassword123"
  }
  ```
- **Respuesta 201**:
  ```json
  {
    "success": true,
    "data": {
      "organizationId": "uuid",
      "userId": "uuid",
      "redirectUrl": "/onboarding"
    }
  }
  ```

---

### Matriz de Rutas de la Feature P6/P7

| Ruta | Acceso | Propósito |
|---|---|---|
| `/` | Público | Landing Page Comercial con propuesta de valor y precios |
| `/register` | Público | Formulario de Registro de Tenant |
| `/onboarding` | Autenticado | Asistente de Inicio Guiado (3 Pasos) |
