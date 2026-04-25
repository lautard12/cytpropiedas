## Objetivo

Sumar al sistema: autenticación con roles, módulo "Mi Organización" (datos + sucursales + personal), ABM completo de propiedades con datos catastrales, anulación de pagos con reversión de estado de liquidación, y auditoría visible solo para administradores. Modales scrolleables y documentación actualizada.

---

## 1. Modelo de datos (nuevas tablas)

Tu base ya tiene `personas` unificando propietarios/inquilinos/garantes. Vamos a **extender** ese modelo para enlazar usuarios del sistema (login) a una persona, sin duplicar datos personales.

**Nuevas tablas:**

- `organizacion` — datos de la inmobiliaria (nombre, logo_url, cuit, fecha_alta, fecha_baja, dirección, teléfono, email).
- `sucursales` — pertenecen a la organización (nombre, dirección, teléfono, es_central, activa).
- `app_role` (enum) — `admin`, `administrativo`.
- `user_roles` — `(user_id → auth.users, role app_role, sucursal_id?)`. Tabla **separada** para roles (evita escalación de privilegios).
- `personas`: agregar columnas `user_id uuid` (link a `auth.users`, nullable, único cuando no nulo) y `sucursal_id uuid` (para personal). Sumar rol `'personal'` al enum `rol_persona`.
- `propiedades`: agregar `latitud numeric`, `longitud numeric`, `matricula_catastral text` (todos opcionales).
- `auditoria` — registro inmutable de cambios sensibles:
  - `id`, `created_at`, `user_id`, `user_email`, `accion` (`crear|editar|eliminar|anular`), `entidad` (`contrato|liquidacion|pago|concepto|propiedad`), `entidad_id`, `descripcion`, `datos_antes jsonb`, `datos_despues jsonb`, `monto numeric?`.

**Función `has_role(_user_id, _role)`** SECURITY DEFINER para usar en RLS sin recursión.

**Seed inicial:**
- 1 organización por defecto ("CyT Propiedades", fecha_alta = hoy).
- 1 sucursal "Central" marcada `es_central = true`.
- Usuario admin `admin@cyt.local` / contraseña `lautaro` con rol `admin` (creado vía signup en código de bootstrap, no en SQL — auth.users no se toca por SQL).

---

## 2. Autenticación y RLS

- Habilitar email/password en Lovable Cloud, **auto-confirm activado** (usuario no necesita verificar mail — son usuarios internos).
- Página `/auth` con login (email + password). Sin signup público — solo admin puede crear usuarios.
- `ProtectedRoute` envuelve todas las rutas excepto `/auth`. Usa `onAuthStateChange` + `getSession`.
- Hook `useCurrentUser()` devuelve `{ user, persona, roles, isAdmin }`.
- **RLS endurecida** — reemplazar las policies actuales `Allow all` por:
  - `personas`, `propiedades`, `contratos`, `liquidaciones`, `conceptos_liquidacion`, `pagos`, `eventos_contrato`, `sucursales`, `organizacion`: SELECT/INSERT/UPDATE/DELETE solo si el usuario está autenticado (`auth.uid() IS NOT NULL`).
  - `user_roles`: SELECT solo del propio usuario; INSERT/UPDATE/DELETE solo si `has_role(auth.uid(),'admin')`.
  - `auditoria`: SELECT solo si `has_role(auth.uid(),'admin')`. INSERT permitido a autenticados (lo escriben los mutaciones). UPDATE/DELETE bloqueado.
  - `organizacion`: UPDATE solo `admin`.

> Esto crea el primer usuario admin desde un script de bootstrap (función edge invocada una vez), porque `auth.users` no se puede insertar por SQL.

---

## 3. Páginas y UI nuevas

### 3.1 `/auth` — Login
Formulario email + password. Validación con zod. Redirige a `/` al loguear.

### 3.2 `/mi-organizacion` (solo admin) con tabs:
- **Datos**: form con nombre, logo (upload a storage), CUIT, dirección, teléfono, email, fecha_alta (readonly), fecha_baja.
- **Sucursales**: tabla + ABM (modal scrolleable). No permite borrar la marcada como central.
- **Personal**: tabla del personal (personas con rol `personal`). ABM crea persona + invita a `auth.users` con password temporal y asigna `user_role` (`admin` o `administrativo`) + sucursal.

Nuevo ítem en sidebar **"Mi Organización"** (visible solo para admin).

### 3.3 ABM de Propiedades
Crear `PropiedadFormDialog.tsx`:
- Form con zod: dirección, unidad, tipo (select), propietario_id (select de personas con rol propietario), metros, ambientes, estado, **latitud, longitud, matrícula catastral** (opcionales), observaciones.
- Botones "Nueva propiedad" y "Editar" en `/propiedades` y `/propiedades/:id`.
- Eliminar valida que no haya contratos activos.
- Modal con `max-h-[85vh] overflow-y-auto`.

### 3.4 Anular pago en Liquidaciones
En `LiquidacionDetalle`, cada pago en estado `Confirmado` gana botón "Anular" (con `AlertDialog` de confirmación + motivo obligatorio). Al anular:
- `pagos.estado = 'Anulado'`.
- Recalcular `liquidaciones.total_cobrado` y `pendiente`.
- Recalcular `liquidaciones.estado` según cobertura: `Cobrada` → `Parcial` o `Pendiente` según corresponda.
- Insertar evento en `eventos_contrato` (tipo `pago_anulado`).
- Insertar registro en `auditoria` con datos antes/después.

Esta lógica vive en una **función Postgres** `anular_pago(pago_id, motivo)` invocada vía RPC, atómica.

### 3.5 Modales scrolleables (transversal)
Aplicar a todos los `DialogContent` existentes (`PersonaFormDialog`, `RegistrarPagoDialog`, nuevos): `max-h-[85vh] overflow-y-auto`.

### 3.6 `/auditoria` (solo admin)
Tabla con filtros (fecha desde/hasta, entidad, acción, usuario). Cada fila se expande para ver `datos_antes` y `datos_despues` en JSON pretty.

---

## 4. Auditoría — qué se loguea

Todas las mutaciones (en hooks o triggers) registran en `auditoria`:
- **Contratos**: crear, editar, cambiar estado, eliminar.
- **Liquidaciones**: emitir, editar conceptos, anular.
- **Pagos**: registrar, anular.
- **Propiedades**: crear, editar, eliminar (cambios estructurales).

Implementación: helper `logAudit(client, { accion, entidad, entidad_id, antes, despues, descripcion, monto })` invocado desde cada mutación. Para anulación de pago se loguea desde la función Postgres.

---

## 5. Sidebar y navegación

Sidebar pasa a renderizar items según rol:
- Todos los autenticados: Dashboard, Propiedades, Contratos, Liquidaciones, Pagos, Propietarios, Inquilinos, Reportes.
- Solo admin: Mi Organización, Auditoría.
- Topbar muestra usuario actual + botón "Cerrar sesión".

---

## 6. Documentación a actualizar

En `docs/`:
- `03-modelo-de-datos.md`: agregar `organizacion`, `sucursales`, `user_roles`, `auditoria`; columnas nuevas en `personas` y `propiedades`; rol `personal`.
- `04-pantallas.md`: agregar `/auth`, `/mi-organizacion`, `/auditoria`.
- `db/schema.sql` y `db/triggers.sql`: reflejar todo el SQL nuevo.
- `db/seed.sql`: organización + sucursal central + nota sobre admin de bootstrap.
- `diagramas/der.mmd`: nuevas entidades.
- `endpoints/`: nuevos archivos `organizacion.md`, `auditoria.md`, `auth.md`; actualizar `propiedades.md` y `pagos.md` (anulación).
- `flujos/`: nuevo `08-anulacion-pago.md` y `09-gestion-organizacion.md`.
- `02-arquitectura.md`: sección de seguridad / roles / RLS.

---

## Detalles técnicos

**Migración SQL (resumen):**
```sql
-- enums
CREATE TYPE app_role AS ENUM ('admin','administrativo');
ALTER TYPE rol_persona ADD VALUE 'personal';

-- nuevas tablas
CREATE TABLE organizacion (...);
CREATE TABLE sucursales (... organizacion_id, es_central bool, activa bool);
CREATE TABLE user_roles (user_id uuid REFERENCES auth.users ON DELETE CASCADE, role app_role, sucursal_id uuid, UNIQUE(user_id, role));
CREATE TABLE auditoria (...);

ALTER TABLE personas ADD COLUMN user_id uuid UNIQUE, ADD COLUMN sucursal_id uuid;
ALTER TABLE propiedades ADD COLUMN latitud numeric, ADD COLUMN longitud numeric, ADD COLUMN matricula_catastral text;

-- función SECURITY DEFINER
CREATE FUNCTION has_role(_user_id uuid, _role app_role) RETURNS boolean ...;

-- función anular_pago(pago_id uuid, motivo text)

-- reescribir TODAS las RLS policies
```

**Bootstrap del admin:**
Edge function `bootstrap-admin` (idempotente, usa service-role) que:
1. Crea organización default si no existe.
2. Crea sucursal "Central" si no existe.
3. Crea usuario `admin@cyt.local` con password `lautaro` (auto-confirmado), su `persona` vinculada y su `user_role = admin`.

Se invoca una sola vez desde el cliente al boot si no hay usuarios. Después se desactiva.

**Stack que se agrega:** `@supabase/supabase-js` ya está. Sin libs nuevas.

---

## Archivos nuevos / editados

**Nuevos:**
- `supabase/migrations/<ts>_auth_org_audit.sql`
- `supabase/functions/bootstrap-admin/index.ts`
- `src/contexts/AuthContext.tsx`
- `src/components/ProtectedRoute.tsx`
- `src/components/RoleGuard.tsx`
- `src/components/PropiedadFormDialog.tsx`
- `src/components/SucursalFormDialog.tsx`
- `src/components/PersonalFormDialog.tsx`
- `src/components/AnularPagoDialog.tsx`
- `src/hooks/useAuth.ts`, `useOrganizacion.ts`, `useSucursales.ts`, `useAuditoria.ts`, `usePropiedadMutations.ts`, `usePagoMutations.ts`
- `src/lib/audit.ts` (helper logAudit)
- `src/pages/Auth.tsx`, `MiOrganizacion.tsx`, `Auditoria.tsx`
- Nuevos `.md` en `docs/`.

**Editados:**
- `src/App.tsx` (rutas + ProtectedRoute), `src/components/layout/Sidebar.tsx` (items por rol), `src/components/layout/Topbar.tsx` (user + logout).
- `src/pages/Propiedades.tsx`, `PropiedadDetalle.tsx` (botones ABM).
- `src/pages/LiquidacionDetalle.tsx` (anular pago).
- `src/components/PersonaFormDialog.tsx`, `RegistrarPagoDialog.tsx` (modales scrolleables).
- `src/hooks/useSupabaseData.ts` (tipos para Propiedad con lat/long/matricula).
- Toda la doc en `docs/`.

---

## Fuera de alcance (lo aclaro para evitar sorpresas)

- No agrego Google OAuth (usuarios internos con email/password).
- No implemento recuperación de contraseña (admin resetea desde "Personal").
- La auditoría no cubre lecturas, solo escrituras.
