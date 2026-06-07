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
5. Operadora puede agregar / quitar / editar conceptos. Los gastos puntuales
   (reparaciones, expensas extraordinarias, reintegros) se cargan vía el
   **diálogo guiado `ConceptoGastoDialog`** que deriva `tipo_impacto` /
   `pagado_por` y guarda montos siempre positivos.
6. **Aplicar conceptos pendientes**: se vuelcan automáticamente las filas de
   `conceptos_pendientes_contrato` con `estado='Pendiente'` para este contrato
   (reintegros diferidos, saldo a favor del inquilino arrastrado). Pasan a
   `estado='Aplicado'` con `liquidacion_aplicada_id`.
7. Sumar **saldo anterior**: `Σ pendiente` de liquidaciones previas no anuladas.
8. Calcular vía función `recalcular_liquidacion()` (ver
   [`08-gastos-y-arreglos.md §4`](./08-gastos-y-arreglos.md)):
   - `subtotal_inquilino   = Σ cobrar_al_inquilino`
   - `reintegros_inquilino = Σ reintegrar_al_inquilino + Σ reintegrar_al_propietario`
   - `total_cobrar         = MAX(0, subtotal − reintegros + saldo_anterior)`
   - `comision_inmobiliaria = alquiler * comision% * (iva ? 1.21 : 1)`
   - Modalidad Inmobiliaria → `neto_propietario`; Modalidad Propietario →
     `total_cobrar_al_propietario`.
9. `POST /liquidaciones` con `estado='Pendiente'`.
10. `POST /conceptos_liquidacion` (batch).
11. Trigger `recalcular_liquidacion` actualiza totales; trigger
    `log_liquidacion_evento` registra `liquidacion_emitida`.

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
