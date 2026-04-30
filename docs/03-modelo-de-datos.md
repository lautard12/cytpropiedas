# 3. Modelo de datos

## Visión general

Tablas principales del dominio + auth/organización (ver §extensiones).

| Tabla | Propósito |
|---|---|
| `personas` | Maestro único de personas físicas/jurídicas — **datos básicos** |
| `propietarios` | Datos específicos de quien es propietario (banco, CBU, condición IVA…) — 1-a-1 con personas |
| `inquilinos` | Datos específicos de quien es inquilino (garante, ocupación, ingresos…) — 1-a-1 con personas |
| `propiedades` | Unidades inmuebles administradas. `propietario_id` → `propietarios.id`. |
| `contratos` | Vínculo propiedad ↔ propietario ↔ inquilino. `propietario_id` → `propietarios.id`, `inquilino_id` → `inquilinos.id`. |
| `liquidaciones` | Cuenta mensual emitida sobre un contrato |
| `conceptos_liquidacion` | Líneas (alquiler, expensas, ABL, ajustes...) |
| `pagos` | Cobros parciales o totales aplicados a una liquidación |
| `eventos_contrato` | Bitácora histórica unificada (timeline) |

> **Roles de dominio** (propietario / inquilino) **ya no se persisten en una tabla aparte**. Se derivan de la **existencia** de la fila correspondiente en `propietarios` / `inquilinos`. El enum `rol_persona` y la tabla `personas_roles` fueron eliminados.

## Enums

```sql
CREATE TYPE tipo_propiedad AS ENUM ('Departamento','Casa','Local','Oficina','Cochera','Galpon','Terreno','Otro');
CREATE TYPE estado_propiedad AS ENUM ('Vacante','Alquilada','Reservada','En refacción','Inactiva');
CREATE TYPE estado_contrato AS ENUM ('Activo','Vencido','Rescindido','Borrador');
CREATE TYPE estado_liquidacion AS ENUM ('Borrador','Pendiente','Parcial','Cobrada','Transferida','Anulada');
CREATE TYPE estado_pago AS ENUM ('Pendiente','Confirmado','Anulado');
CREATE TYPE medio_pago AS ENUM ('Transferencia','Efectivo','Cheque','Mercado Pago','Débito automático');
CREATE TYPE app_role AS ENUM ('admin','administrativo');
```

## Detalle por entidad

### `personas`
**Solo datos básicos** comunes a cualquier persona en el sistema. **No tiene `user_id`** — el vínculo con el usuario del sistema vive en `usuarios.persona_id`.

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | `gen_random_uuid()` |
| nombre | text | obligatorio |
| dni | text | candidato a único, hoy permite vacío |
| cuit | text | candidato a único |
| email | text | normalizado a minúsculas |
| telefono, direccion | text | |
| observaciones | text | |
| sucursal_id | uuid → sucursales | sucursal donde opera (cuando aplica) |
| created_at, updated_at | timestamptz | trigger `set_updated_at` |

**Reglas:**
- Detección de duplicados: al crear se busca por `dni`, `cuit` o `email` no vacíos. Si
  existe, se ofrece **agregar el rol** sin duplicar la persona.
- La eliminación de la última fila en `propietarios`/`inquilinos` borra la persona si no quedan otros vínculos (lógica del front).

### `propietarios` (1-a-1 con `personas`)
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | usado por `propiedades.propietario_id` y `contratos.propietario_id` |
| persona_id | uuid UNIQUE → personas | `ON DELETE CASCADE` |
| banco | text | banco para rendición |
| cbu | text | CBU para transferencias |
| alias_cbu | text | alias bancario |
| condicion_iva | text | "Consumidor Final", "Monotributo", "Responsable Inscripto"… (default: Consumidor Final) |
| observaciones_fiscales | text | |
| created_at, updated_at | timestamptz | |

### `inquilinos` (1-a-1 con `personas`)
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | usado por `contratos.inquilino_id` |
| persona_id | uuid UNIQUE → personas | `ON DELETE CASCADE` |
| garante_nombre | text | |
| garante_telefono | text | |
| garante_dni | text | |
| ocupacion | text | |
| ingresos_declarados | numeric | |
| observaciones_inquilino | text | |
| created_at, updated_at | timestamptz | |

### Roles de dominio (derivados)
No existe tabla `personas_roles`. Para saber los roles de una persona se consulta directamente:

- es **propietario** ⇔ existe fila en `propietarios` con su `persona_id`.
- es **inquilino**   ⇔ existe fila en `inquilinos` con su `persona_id`.

El front lo expone en `Persona.roles` (calculado en los hooks de lectura).

## Funciones RPC

- **`upsert_propietario(_persona_id, ...)`**: crea o actualiza atómicamente `personas` + `propietarios`. Si `_persona_id` es null, crea ambas. Devuelve `propietarios.id`.
- **`upsert_inquilino(_persona_id, ...)`**: análogo para `inquilinos`.



### `propiedades`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| direccion | text | |
| unidad | text | piso/depto |
| tipo | `tipo_propiedad` | |
| propietario_id | uuid FK → personas | rol propietario esperado |
| estado | `estado_propiedad` | |
| contrato_activo_id | uuid FK → contratos | denormalizado para acceso rápido |
| metros, ambientes | numeric/int | |
| observaciones | text | |

### `contratos`
| Columna | Tipo | Notas |
|---|---|---|
| id, codigo | uuid / text | `codigo` legible (ej. `CTR-2025-001`) |
| propiedad_id, propietario_id, inquilino_id | uuid FK | |
| fecha_inicio, fecha_fin | date | |
| estado | `estado_contrato` | |
| alquiler_base | numeric | monto mensual al inicio |
| tipo_ajuste | text | `ICL`, `IPC`, `Fijo`, `Negociado` |
| frecuencia_ajuste | text | `Trimestral`, `Cuatrimestral`, `Semestral`, `Anual` |
| dia_vencimiento | int | día del mes |
| comision_porcentaje | numeric | % sobre alquiler |
| iva | boolean | si la comisión lleva IVA |
| tgi, api, expensas_ordinarias, expensas_extraordinarias, seguro, servicios | text | quién paga: `Inquilino` / `Propietario` / `No aplica` |
| reglas_observaciones | text | |
| created_at | timestamptz | |

### `liquidaciones`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| contrato_id | uuid FK | |
| periodo | text | `YYYY-MM` |
| periodo_label | text | "Marzo 2025" |
| fecha_emision | date | default `CURRENT_DATE` |
| estado | `estado_liquidacion` | |
| subtotal | numeric | suma conceptos al inquilino |
| total_cobrar | numeric | subtotal + saldo anterior |
| total_cobrado | numeric | suma de pagos confirmados |
| pendiente | numeric | `total_cobrar - total_cobrado` |
| comision_inmobiliaria | numeric | calculado al emitir |
| neto_propietario | numeric | a transferir |
| saldo_anterior | numeric | de liquidaciones previas |
| observaciones | text | |

`UNIQUE(contrato_id, periodo)`.

### `conceptos_liquidacion`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| liquidacion_id | uuid FK | on delete cascade |
| concepto | text | "Alquiler", "ABL", "Expensas", "Ajuste ICL"... |
| monto | numeric | |
| responsable | text | `Inquilino` / `Propietario` |
| aplica_al_inquilino | boolean | si suma al `total_cobrar` |

### `pagos`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| liquidacion_id, contrato_id | uuid FK | |
| fecha | date | |
| monto | numeric | |
| medio_pago | `medio_pago` | |
| referencia | text | nro recibo / transacción |
| estado | `estado_pago` | |
| observaciones | text | |

### `eventos_contrato`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| contrato_id | uuid FK | |
| liquidacion_id | uuid FK nullable | |
| periodo | text nullable | |
| fecha | date | |
| tipo | text | ej. `liquidacion_emitida`, `pago_registrado`, `ajuste_icl`, `notificacion_mora`... |
| categoria | text | `contractual` / `financiero` / `administrativo` / `documental` |
| descripcion | text | |
| monto | numeric nullable | |
| documento_url | text nullable | adjunto opcional |

## Diagrama Entidad-Relación

Ver [`diagramas/der.mmd`](./diagramas/der.mmd).

---

## Extensiones (v2 — auth & auditoría)

Ver detalle completo en [`10-auth-y-organizacion.md`](./10-auth-y-organizacion.md).

### Nuevas tablas
- `organizacion`, `sucursales` (FK `organizacion_id`) — datos de la inmobiliaria.
- **`usuarios`** — espejo público de `auth.users` (id, email, nombre, activo, ultimo_login, **`persona_id` UNIQUE → personas**). Se crea automáticamente con el trigger `on_auth_user_created`.
- **`roles`** — catálogo de roles (`codigo app_role`, `nombre`, `descripcion`). Editable por admin.
- **`user_roles`** — N:M entre `usuarios` y `roles`, con FKs explícitas y unicidad `(user_id, role_id)`. Conserva una columna `role` denormalizada (sincronizada por trigger) para que `has_role()` siga siendo SQL puro. **Es la única vía para asignar roles de aplicación.**
- `auditoria` — registro inmutable de cambios sensibles (RLS: solo admin lee, nadie modifica). FK `user_id → usuarios(id)`.

### Cambios en tablas existentes
- `personas`: **se eliminó la columna `user_id`**. La relación 1:1 con `usuarios` vive ahora en `usuarios.persona_id` (un usuario apunta a su persona).
- `propiedades`: `+ latitud numeric`, `+ longitud numeric`, `+ matricula_catastral text`.

### Tablas / enums eliminados
- ❌ `personas_roles` (tabla) — los roles de dominio se derivan de propietarios/inquilinos.
- ❌ `rol_persona` (enum) — ya no se usa.

### Nuevo enum
- `app_role`: `admin` | `administrativo`.

### Nuevas funciones
- `has_role(_user_id uuid, _role app_role)` — SECURITY DEFINER, usada en RLS.
- `anular_pago(_pago_id uuid, _motivo text)` — RPC atómica que anula el pago, recalcula la liquidación, registra evento y entrada de auditoría.
