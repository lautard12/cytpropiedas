# Endpoints — Pagos

Pantallas: `/pagos`, dialogo `RegistrarPagoDialog` (en `LiquidacionDetalle`).

---

## 1. Listado global de pagos

**Hook**
```ts
usePagos(): UseQueryResult<Pago[]>
```

**HTTP**
```
GET /rest/v1/pagos?select=*&order=fecha.desc
```

Filtros típicos en frontend: por contrato, medio de pago, rango de fechas.

---

## 2. Pagos de una liquidación

**Hook**
```ts
usePagosByLiquidacion(liquidacionId): UseQueryResult<Pago[]>
```

**HTTP**
```
GET /rest/v1/pagos?liquidacion_id=eq.{id}&select=*
```

---

## 3. Registrar un pago

**HTTP**
```
POST /rest/v1/pagos
Headers: Prefer: return=representation
Body:
{
  "liquidacion_id": "uuid",
  "contrato_id":    "uuid",
  "fecha":          "2025-04-08",
  "monto":          200000,
  "medio_pago":     "Transferencia",
  "referencia":     "BCO-XYZ-998877",
  "estado":         "Confirmado",
  "observaciones":  ""
}
```

### Side-effects backend (triggers)
- `recalc_liquidacion_totales` actualiza la liquidación:
  - `total_cobrado = Σ pagos confirmados`
  - `pendiente = total_cobrar − total_cobrado`
  - `estado` pasa a `Parcial` o `Cobrada` (no toca `Transferida` / `Anulada` / `Borrador`).
- `log_pago_evento` agrega entrada en `eventos_contrato`.

---

## 4. Anular un pago

```
PATCH /rest/v1/pagos?id=eq.{id}
Body: { "estado": "Anulado" }
```
El trigger recalcula la liquidación y puede revertir su estado.

---

## 5. Validaciones cliente
- `monto > 0`.
- `monto <= pendiente` (warning si lo excede; permitir solo con confirmación).
- `fecha <= hoy`.
- Si `medio_pago = 'Cheque'` ⇒ requerir `referencia`.
