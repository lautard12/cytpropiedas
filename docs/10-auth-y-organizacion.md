# 10. Autenticación, Organización y Auditoría

## Autenticación

- Login email + password (`/auth`). Signup público deshabilitado.
- Auto-confirm de email activado (usuarios internos).
- Provider: `AuthContext` con `onAuthStateChange` + `getSession`.
- Rutas protegidas con `<ProtectedRoute>`. Rutas admin con `requireAdmin`.

### Usuario por defecto
| Email | Password | Rol |
|---|---|---|
| `admin@cyt.local` | `lautaro` | admin |

Lo crea idempotentemente la edge function `bootstrap-admin` en el primer arranque.

## Roles de aplicación (`user_roles`)

Enum `app_role`: `admin`, `administrativo`. Tabla separada de `personas` para evitar escalación de privilegios. Helper SECURITY DEFINER `has_role(uid, role)` para uso en RLS.

## Organización y sucursales

- `organizacion`: nombre, logo, CUIT, dirección, teléfono, email, fecha_alta, fecha_baja.
- `sucursales`: pertenecen a la organización, con marca `es_central` y `activa`. Una "Central" se crea por seed.
- ABM en `/mi-organizacion` (solo admin), tabs Datos / Sucursales / Personal.
- "Personal" = personas con rol `personal` + usuario en auth + rol de aplicación. Alta integrada desde `PersonalFormDialog`.

## Personas ↔ Usuarios

`personas.user_id` (uuid, único) vincula la persona con `auth.users`. `personas.sucursal_id` ubica al personal en una sucursal. Inquilinos/propietarios/garantes no tienen `user_id`.

## Propiedades — campos nuevos

- `latitud numeric` (opcional)
- `longitud numeric` (opcional)
- `matricula_catastral text` (opcional)

ABM completo en `/propiedades` (`PropiedadFormDialog`). Eliminar valida que no haya contratos activos.

## Anulación de pagos

RPC `anular_pago(_pago_id, _motivo)`:
1. Marca el pago como `Anulado`.
2. Recalcula `total_cobrado` y `pendiente` de la liquidación.
3. Revierte el estado: `Cobrada → Parcial` o `Pendiente` según corresponda.
4. Inserta evento `pago_anulado` en `eventos_contrato`.
5. Registra entrada en `auditoria` con `datos_antes`/`datos_despues`.

UI: botón "Anular" en cada pago confirmado dentro de `LiquidacionDetalle`, requiere motivo (mín. 4 chars).

## Auditoría

Tabla `auditoria` (inmutable: solo INSERT y SELECT permitidos por RLS):

| Campo | Tipo |
|---|---|
| user_id, user_email | uuid, text |
| accion | `crear / editar / eliminar / anular / otro` |
| entidad | `contrato / liquidacion / pago / propiedad / persona / organizacion / sucursal / user_role` |
| entidad_id | uuid |
| descripcion | text |
| datos_antes, datos_despues | jsonb |
| monto | numeric |

- Helper cliente: `src/lib/audit.ts → logAudit(entry)` invocado desde mutaciones.
- Helper servidor: la RPC `anular_pago` escribe directamente.
- Visible solo para `admin` en `/auditoria` con filtros (entidad, acción, fechas) y expansión por fila para inspeccionar JSON antes/después.

## RLS — resumen

| Tabla | SELECT | INSERT/UPDATE/DELETE |
|---|---|---|
| personas, propiedades, contratos, liquidaciones, conceptos_liquidacion, pagos, eventos_contrato, sucursales | autenticados | autenticados |
| organizacion | autenticados | UPDATE/DELETE solo `admin` |
| user_roles | propio o admin | solo `admin` |
| auditoria | solo `admin` | INSERT autenticado; UPDATE/DELETE bloqueado |
