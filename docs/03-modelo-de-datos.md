# 3. Modelo de datos

## Visión general

8 tablas + 5 enums.

| Tabla | Propósito |
|---|---|
| `personas` | Maestro único de personas físicas/jurídicas |
| `personas_roles` | Roles que cumple una persona (propietario / inquilino / garante) |
| `propiedades` | Unidades inmuebles administradas |
| `contratos` | Vínculo propiedad ↔ propietario ↔ inquilino con reglas comerciales |
| `liquidaciones` | Cuenta mensual emitida sobre un contrato |
| `conceptos_liquidacion` | Líneas (alquiler, expensas, ABL, ajustes...) |
| `pagos` | Cobros parciales o totales aplicados a una liquidación |
| `eventos_contrato` | Bitácora histórica unificada (timeline) |

## Enums

```sql
CREATE TYPE rol_persona AS ENUM ('propietario', 'inquilino', 'garante');
CREATE TYPE tipo_propiedad AS ENUM ('Departamento','Casa','Local','Oficina','Cochera','Galpon','Terreno','Otro');
CREATE TYPE estado_propiedad AS ENUM ('Vacante','Alquilada','Reservada','En refacción','Inactiva');
CREATE TYPE estado_contrato AS ENUM ('Activo','Vencido','Rescindido','Borrador');
CREATE TYPE estado_liquidacion AS ENUM ('Borrador','Pendiente','Parcial','Cobrada','Transferida','Anulada');
CREATE TYPE estado_pago AS ENUM ('Pendiente','Confirmado','Anulado');
CREATE TYPE medio_pago AS ENUM ('Transferencia','Efectivo','Cheque','Mercado Pago','Débito automático');
```

## Detalle por entidad

### `personas`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | `gen_random_uuid()` |
| nombre | text | obligatorio |
| dni | text | candidato a único, hoy permite vacío |
| cuit | text | candidato a único |
| email | text | normalizado a minúsculas |
| telefono, direccion | text | |
| banco, cbu | text | datos para rendición al propietario |
| garante, garante_telefono | text | datos heredados (rol garante se modela aparte) |
| observaciones | text | |
| created_at, updated_at | timestamptz | trigger `set_updated_at` |

**Reglas:**
- Detección de duplicados: al crear se busca por `dni`, `cuit` o `email` no vacíos. Si
  existe, se ofrece **agregar el rol** en vez de duplicar la persona.
- Eliminar requiere validar que no haya contratos / propiedades activas vinculadas.

### `personas_roles`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| persona_id | uuid FK → personas | on delete cascade |
| rol | `rol_persona` | |
| created_at | timestamptz | |

`UNIQUE(persona_id, rol)`.

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
- `organizacion`, `sucursales` — datos de la inmobiliaria y sucursales.
- `user_roles` — vincula `auth.users` con un rol de aplicación (`admin` / `administrativo`) y opcionalmente con una sucursal. Tabla separada para evitar escalación de privilegios.
- `auditoria` — registro inmutable de cambios sensibles (RLS: solo admin lee, nadie modifica).

### Cambios en tablas existentes
- `personas`: `+ user_id uuid UNIQUE` (link a `auth.users`), `+ sucursal_id uuid`.
- `propiedades`: `+ latitud numeric`, `+ longitud numeric`, `+ matricula_catastral text`.
- Enum `rol_persona`: `+ 'personal'`.

### Nuevo enum
- `app_role`: `admin` | `administrativo`.

### Nuevas funciones
- `has_role(_user_id uuid, _role app_role)` — SECURITY DEFINER, usada en RLS.
- `anular_pago(_pago_id uuid, _motivo text)` — RPC atómica que anula el pago, recalcula la liquidación, registra evento y entrada de auditoría.
