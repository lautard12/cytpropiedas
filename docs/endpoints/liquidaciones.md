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
```
POST /rest/v1/conceptos_liquidacion
Body:
[
  { "liquidacion_id": "uuid", "concepto": "Alquiler",        "monto": 350000, "responsable": "Inquilino", "aplica_al_inquilino": true },
  { "liquidacion_id": "uuid", "concepto": "Expensas ordin.", "monto":  60000, "responsable": "Inquilino", "aplica_al_inquilino": true },
  { "liquidacion_id": "uuid", "concepto": "ABL",             "monto":  15000, "responsable": "Inquilino", "aplica_al_inquilino": true }
]
```

### Cálculo (frontend)
```
subtotal              = Σ conceptos.aplica_al_inquilino * monto
total_cobrar          = subtotal + saldo_anterior
comision_inmobiliaria = alquiler_base * comision_porcentaje / 100
                        + (iva ? * 1.21 : 0)
pendiente             = total_cobrar - total_cobrado
neto_propietario      = total_cobrado - comision_inmobiliaria
                        - Σ conceptos a cargo del propietario
```

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
