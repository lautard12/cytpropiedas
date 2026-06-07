# Flujo 04 — Rendición al propietario

## Objetivo
Transferir al propietario el **neto** de una liquidación cobrada y dejar
trazabilidad.

## Precondiciones
- Liquidación en estado `Cobrada` (`pendiente = 0`).
- `propietario_id` con datos bancarios completos (`banco`, `cbu`).

## Pasos

1. Operadora abre la liquidación.
2. El neto ya está calculado por `recalcular_liquidacion()` según la modalidad
   del contrato (`destino_cobro`):
   - **Inmobiliaria**:
     `neto_propietario = total_cobrado − comisión − gastos_descontables + gastos_a_reintegrar`
   - **Propietario** (cobra él directo):
     `total_cobrar_al_propietario = comisión + IVA + gastos_descontables − gastos_a_reintegrar`

   Donde `gastos_descontables` excluye los `descontar_al_propietario` que ya
   tienen un `reintegrar_al_inquilino` vinculado (anti-doble-descuento; ver
   [`08-gastos-y-arreglos.md §5`](./08-gastos-y-arreglos.md)).
3. Realiza la transferencia bancaria por fuera del sistema.
4. Marca como rendida:
   ```
   PATCH /liquidaciones?id=eq.X
   Body: { "estado": "Transferida", "neto_propietario": <monto> }
   ```
5. Trigger `log_liquidacion_evento` registra `liquidacion_estado` con
   `descripcion='Estado: Cobrada → Transferida'`.
6. (Roadmap) Adjuntar comprobante en `eventos_contrato.documento_url`.

## Lote (roadmap)

Permitir rendir múltiples liquidaciones del mismo propietario en un solo asiento,
generando un **resumen de rendición** mensual con desglose por contrato.
