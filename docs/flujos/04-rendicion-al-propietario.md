# Flujo 04 — Rendición al propietario

## Objetivo
Transferir al propietario el **neto** de una liquidación cobrada y dejar
trazabilidad.

## Precondiciones
- Liquidación en estado `Cobrada` (`pendiente = 0`).
- `propietario_id` con datos bancarios completos (`banco`, `cbu`).

## Pasos

1. Operadora abre la liquidación.
2. Calcula neto = `total_cobrado − comision_inmobiliaria − Σ conceptos a cargo del propietario`.
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
