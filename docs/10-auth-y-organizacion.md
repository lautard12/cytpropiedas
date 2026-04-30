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

## Modelo de usuarios y roles (refactor estructural)

Tres tablas con relaciones explícitas mediante claves foráneas:

```
auth.users ─1:1─► usuarios ─N:M─► roles
                     ▲
                     │ 1:1 (opcional)
                     │
                  personas
```

### `usuarios` (espejo público de `auth.users`)
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | FK a `auth.users(id)` ON DELETE CASCADE |
| email | text | único (case-insensitive) |
| nombre | text | nombre para mostrar |
| activo | boolean | habilita/deshabilita el acceso lógico |
| ultimo_login | timestamptz | uso futuro |
| created_at, updated_at | timestamptz | |

Trigger `on_auth_user_created` (sobre `auth.users`) crea automáticamente la fila en `usuarios` cuando alguien se registra.

### `roles` (catálogo)
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| codigo | `app_role` | único — usado por `has_role()` y RLS |
| nombre | text | etiqueta legible |
| descripcion | text | qué puede hacer ese rol |

Roles iniciales: `admin` (Administrador), `administrativo` (Administrativo). Editable solo por admin.

### `user_roles` (N:M)
| Columna | Tipo | Notas |
|---|---|---|
| user_id | uuid FK → `usuarios(id)` | ON DELETE CASCADE |
| role_id | uuid FK → `roles(id)` | ON DELETE RESTRICT |
| role | `app_role` | denormalizado, sincronizado por trigger para que `has_role()` siga siendo SQL puro |
| sucursal_id | uuid FK → `sucursales(id)` | opcional |
| UNIQUE | (user_id, role_id) | un usuario no repite el mismo rol |

Helper SECURITY DEFINER `has_role(uid, role)` se mantiene sin cambios (consulta `user_roles.role`), por lo que las políticas RLS y el front no necesitan tocarse. La columna `role` se sincroniza desde `role_id` con el trigger `trg_user_roles_sync`.

## Organización y sucursales

- `organizacion`: nombre, logo, CUIT, dirección, teléfono, email, fecha_alta, fecha_baja.
- `sucursales`: pertenecen a la organización (FK explícita `organizacion_id`), con marca `es_central` y `activa`. Una "Central" se crea por seed.
- ABM en `/mi-organizacion` (solo admin), tabs Datos / Sucursales / Personal.
- "Personal" = personas con `user_id` no nulo + rol de aplicación asignado. Alta integrada desde `PersonalFormDialog`.

## Personas ↔ Usuarios

`personas.user_id` (uuid, **único**) ahora referencia a `usuarios(id)` (no a `auth.users` directamente). Una persona se vincula a un usuario, no a un rol — los roles se administran en `user_roles`. `personas.sucursal_id` referencia a `sucursales(id)`. Inquilinos/propietarios/garantes no tienen `user_id`.

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
