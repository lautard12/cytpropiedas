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
                     │
                     │ 1:1 (opcional, vía usuarios.persona_id)
                     ▼
                  personas
```

> El vínculo persona ↔ usuario vive en **`usuarios.persona_id`** (no en `personas.user_id`, que ya no existe). Una persona puede existir sin usuario; un usuario puede existir sin persona vinculada.

### `usuarios` (espejo público de `auth.users`)
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | FK a `auth.users(id)` ON DELETE CASCADE |
| email | text | único (case-insensitive) |
| nombre | text | nombre para mostrar |
| activo | boolean | habilita/deshabilita el acceso lógico |
| **persona_id** | uuid UNIQUE → `personas(id)` | ON DELETE SET NULL — vínculo opcional 1:1 |
| ultimo_login | timestamptz | uso futuro |
| created_at, updated_at | timestamptz | |

Trigger `on_auth_user_created` (sobre `auth.users`) crea automáticamente la fila en `usuarios`. Si en `raw_user_meta_data` viene un `persona_id`, intenta vincularlo (si la persona aún no está tomada por otro usuario).

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

`user_roles` es la **única** tabla que asigna roles de aplicación. Los "roles de dominio" (propietario / inquilino) ya no se persisten: se derivan de la existencia de filas en `propietarios` / `inquilinos` para una `persona_id` dada.

## Organización y sucursales

- `organizacion`: nombre, logo, CUIT, dirección, teléfono, email, fecha_alta, fecha_baja.
- `sucursales`: pertenecen a la organización (FK explícita `organizacion_id`), con marca `es_central` y `activa`. Una "Central" se crea por seed.
- ABM en `/mi-organizacion` (solo admin), tabs Datos / Sucursales / Personal.
- "Personal" = usuarios con `persona_id` no nulo + rol de aplicación + **legajo** activo en la tabla `personal`. Alta integrada desde `PersonalFormDialog` (edge function `create-personal`, que crea auth user + persona + rol + legajo). Baja desde `PersonalBajaDialog` (cierra el legajo y desactiva el usuario).

## Personal (legajo persona ↔ sucursal)

Tabla `personal` que registra el ciclo laboral de una persona dentro de una sucursal.

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| persona_id | uuid → `personas(id)` | ON DELETE CASCADE — a quién pertenece el legajo |
| sucursal_id | uuid → `sucursales(id)` | ON DELETE SET NULL — sucursal donde trabaja |
| fecha_alta | date | por defecto `CURRENT_DATE` |
| causa_alta | text | por defecto `'Alta Personal'` |
| fecha_baja | date NULL | NULL = legajo activo |
| causa_baja | text NULL | ej. `Renuncia`, `Despido`, `Jubilación`, `Fallecimiento`, `Fin de contrato` |
| activo | boolean GENERATED | `fecha_baja IS NULL` (calculado) |
| observaciones | text | |

Reglas:
- Índice único parcial garantiza **un solo legajo activo por persona**: una baja debe registrarse antes de un nuevo alta en otra sucursal.
- RLS: SELECT abierto a autenticados; INSERT/UPDATE/DELETE solo `admin`.
- La baja desde la UI también pone `usuarios.activo = false` para revocar el acceso lógico.

## Personas ↔ Usuarios

El vínculo 1:1 vive en **`usuarios.persona_id`** (uuid UNIQUE → `personas(id)`, ON DELETE SET NULL). La columna `personas.user_id` **fue eliminada**. Una persona puede no tener usuario (inquilinos/propietarios comunes); un usuario puede no tener persona vinculada hasta que se complete el alta de personal. Los roles de aplicación se administran exclusivamente en `user_roles`.

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
| personas, propiedades, contratos, liquidaciones, conceptos_liquidacion, pagos, eventos_contrato, sucursales, propietarios, inquilinos | autenticados | autenticados |
| personal | autenticados | solo `admin` |
| organizacion | autenticados | UPDATE/DELETE solo `admin` |
| usuarios | propio o `admin` | INSERT/DELETE solo `admin`; UPDATE propio o `admin` |
| roles | autenticados | solo `admin` |
| user_roles | propio o `admin` | solo `admin` |
| auditoria | solo `admin` | INSERT autenticado; UPDATE/DELETE bloqueado |
