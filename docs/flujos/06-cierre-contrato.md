# Flujo 06 — Cierre / rescisión de contrato

## Variantes
- **Vencimiento natural**: `fecha_fin` alcanzada.
- **Rescisión anticipada**: el inquilino se va antes; suele aplicar penalidad.
- **Renovación**: se firma un contrato nuevo (otro registro) o se prorroga el
  existente cambiando `fecha_fin`.

## Pasos (rescisión)

1. Operadora abre `/contratos/:id`.
2. Acción "Rescindir" ⇒ formulario con:
   - Fecha efectiva.
   - Motivo (texto libre).
   - Penalidad calculada (si aplica) según ley 27.551 / cláusulas del contrato.
3. `PATCH /contratos` con `estado='Rescindido'`, `fecha_fin = fecha efectiva`.
4. Trigger `sync_propiedad_estado` libera la propiedad
   (`estado='Vacante'`, `contrato_activo_id=NULL`).
5. Si hay penalidad, generar liquidación adicional:
   `POST /liquidaciones` con concepto "Penalidad por rescisión".
6. Registrar evento `tipo='rescision'` con descripción.

## Devolución de depósito (roadmap)

- Modelar `depositos` con monto entregado y devolución parcial/total.
- Restar daños/saldos pendientes antes de devolver.
