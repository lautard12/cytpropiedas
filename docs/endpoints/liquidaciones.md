# Endpoints — Liquidaciones

Pantallas: `/liquidaciones`, `/liquidaciones/:id`, `/generar-liquidacion`.

---

## 1. Listar liquidaciones

**Hook**
```ts
useLiquidaciones(): UseQueryResult<Liquidacion[]>
```

**HTTP**
```
GET /rest/v1/liquidaciones?select=*&order=periodo.desc
```

---

## 2. Detalle de liquidación

**Hooks**
```ts
useLiquidacion(id):              UseQueryResult<Liquidacion | null>
useConceptosLiquidacion(id):     UseQueryResult<ConceptoLiquidacion[]>
usePagosByLiquidacion(id):       UseQueryResult<Pago[]>
```

**HTTP**
```
GET /rest/v1/liquidaciones?id=eq.{id}&select=*
GET /rest/v1/conceptos_liquidacion?liquidacion_id=eq.{id}
GET /rest/v1/pagos?liquidacion_id=eq.{id}
```

---

## 3. Generar liquidación (Generar Liquidación)

Transacción cliente en 2 pasos. Idealmente migrar a una **edge function** o
**RPC** de PostgreSQL para atomicidad.

### 3.1 Insertar la cabecera
```
POST /rest/v1/liquidaciones
Headers: Prefer: return=representation
Body:
{
  "contrato_id": "uuid",
  "periodo": "2025-04",
  "periodo_label": "Abril 2025",
  "fecha_emision": "2025-04-01",
  "estado": "Pendiente",
  "subtotal": 425000,
  "saldo_anterior": 0,
  "total_cobrar": 425000,
  "total_cobrado": 0,
  "pendiente": 425000,
  "comision_inmobiliaria": 36125,
  "neto_propietario": 0,
  "observaciones": ""
}
```

### 3.2 Insertar conceptos
`monto` SIEMPRE positivo. El signo lo deriva `tipo_impacto`. `aplica_al_inquilino`
se deriva por trigger desde `tipo_impacto`.

```
POST /rest/v1/conceptos_liquidacion
Body:
[
  { "liquidacion_id":"uuid", "concepto":"Alquiler",      "monto":350000, "responsable":"Inquilino",   "pagado_por":"Inmobiliaria", "tipo_impacto":"cobrar_al_inquilino",      "periodo_impacto":"Actual" },
  { "liquidacion_id":"uuid", "concepto":"Expensas ord.", "monto": 60000, "responsable":"Inquilino",   "pagado_por":"Inmobiliaria", "tipo_impacto":"cobrar_al_inquilino",      "periodo_impacto":"Actual" },
  { "liquidacion_id":"uuid", "concepto":"Termotanque",   "monto": 80000, "responsable":"Propietario", "pagado_por":"Inmobiliaria", "tipo_impacto":"descontar_al_propietario", "periodo_impacto":"Actual" }
]
```

### 3.3 Conceptos pendientes (diferidos / arrastre)
Antes de calcular totales, se vuelcan los pendientes del contrato:

```
GET   /rest/v1/conceptos_pendientes_contrato?contrato_id=eq.X&estado=eq.Pendiente
POST  /rest/v1/conceptos_liquidacion        (batch con los datos derivados)
PATCH /rest/v1/conceptos_pendientes_contrato?id=in.(...)
Body: { "estado":"Aplicado", "liquidacion_aplicada_id":"uuid", "fecha_aplicacion":"..." }
```

### Cálculo (función SQL `recalcular_liquidacion()`)
Se ejecuta por trigger ante cualquier cambio en `conceptos_liquidacion`.

```
subtotal_inquilino   = Σ monto WHERE tipo_impacto='cobrar_al_inquilino'
reintegros_inquilino = Σ monto WHERE tipo_impacto IN
                                ('reintegrar_al_inquilino','reintegrar_al_propietario')
total_cobrar_bruto   = subtotal_inquilino − reintegros_inquilino + saldo_anterior
total_cobrar         = GREATEST(0, total_cobrar_bruto)
saldo_a_favor_inq.   = GREATEST(0, −total_cobrar_bruto)   → conceptos_pendientes_contrato

gastos_descontables  = Σ descontar_al_propietario
                       EXCLUYENDO los compensados por concepto_relacionado_id
gastos_a_reintegrar  = Σ reintegrar_al_propietario
comision             = alquiler_base * comision% * (iva ? 1.21 : 1)

-- Modalidad Inmobiliaria
neto_propietario          = total_cobrado − comision − gastos_descontables + gastos_a_reintegrar
-- Modalidad Propietario
total_cobrar_propietario  = comision + iva_comision + gastos_descontables − gastos_a_reintegrar

pendiente            = total_cobrar − total_cobrado
```

Detalle completo y matriz de derivación: [`../flujos/08-gastos-y-arreglos.md`](../flujos/08-gastos-y-arreglos.md).

### Constraints
- `UNIQUE(contrato_id, periodo)` evita duplicar liquidación del mismo mes ⇒ `409`.

### Side-effects backend
- Trigger `log_liquidacion_evento` agrega un `eventos_contrato`
  `tipo='liquidacion_emitida'`.

---

## 4. Cambiar estado / rendir al propietario

```
PATCH /rest/v1/liquidaciones?id=eq.{id}
Body: { "estado": "Transferida", "neto_propietario": 313875 }
```

Trigger registra el cambio de estado en `eventos_contrato`.

---

## 5. Anular liquidación

```
PATCH /rest/v1/liquidaciones?id=eq.{id}
Body: { "estado": "Anulada", "observaciones": "Motivo..." }
```

Recomendación: anular previamente todos los pagos asociados (`Pendiente` ⇐ `Anulado`).

---

## 6. Navegación período prev/next (LiquidacionDetalle)

Calculada en cliente con la lista filtrada por `contrato_id` ordenada por `periodo`.
No expone endpoint adicional.
