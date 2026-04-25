# Flujo 02 — Generación de liquidación mensual

**Pantalla:** `/generar-liquidacion`.

## Objetivo
Emitir la cuenta mensual de un contrato activo para un período `YYYY-MM`,
calculando alquiler ajustado, conceptos a cargo del inquilino, saldo anterior
y comisión inmobiliaria.

## Precondiciones
- Contrato en estado `Activo`.
- No existe ya una liquidación con ese `(contrato_id, periodo)`.

## Pasos

1. Operadora selecciona contrato + período (`YYYY-MM`).
2. Frontend trae el contrato y verifica unicidad
   (`GET /liquidaciones?contrato_id=eq.X&periodo=eq.YYYY-MM`).
3. **Cálculo de alquiler vigente**:
   - Si `tipo_ajuste = 'Fijo'` ⇒ `alquiler_base`.
   - Si `tipo_ajuste IN ('ICL','IPC')` ⇒ aplicar coeficiente acumulado según
     `frecuencia_ajuste` (roadmap: tabla `indices_ajuste` + job).
4. Generar **conceptos por defecto** según reglas del contrato:
   | Concepto | Se incluye si | Responsable |
   |---|---|---|
   | Alquiler | siempre | Inquilino |
   | Expensas ordinarias | `expensas_ordinarias='Inquilino'` | Inquilino |
   | TGI / ABL | `tgi='Inquilino'` | Inquilino |
   | API | `api='Inquilino'` | Inquilino |
   | Seguro | `seguro='Inquilino'` | Inquilino |
   | Servicios | `servicios='Inquilino'` | Inquilino |
   | Expensas extraordinarias | `=='Inquilino'` (raro) | según |
5. Operadora puede agregar / quitar / editar conceptos.
6. Sumar **saldo anterior**: `Σ pendiente` de liquidaciones previas no anuladas.
7. Calcular:
   - `subtotal = Σ conceptos.aplica_al_inquilino * monto`
   - `total_cobrar = subtotal + saldo_anterior`
   - `comision_inmobiliaria = alquiler * comision% * (iva ? 1.21 : 1)`
8. `POST /liquidaciones` con `estado='Pendiente'`.
9. `POST /conceptos_liquidacion` (batch).
10. Trigger `log_liquidacion_evento` registra entrada `liquidacion_emitida`.

## Side-effects

- Si en el futuro se implementa **envío automático**, aquí se dispara email/PDF al
  inquilino vía edge function.

## Diagrama

Ver [`../diagramas/flujo-liquidacion.mmd`](../diagramas/flujo-liquidacion.mmd).

## Casos borde

- **Período pasado**: permitido pero el sistema avisa con confirmación.
- **Contrato `Vencido` o `Rescindido`** dentro del período: permitir pro rata.
- **Saldo anterior negativo** (a favor del inquilino): se descuenta del total a
  cobrar; nunca se vuelve negativo el `total_cobrar` (mínimo 0).
