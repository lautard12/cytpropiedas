
# Mejoras al circuito de Liquidaciones, Mora, Comisión y Rendición

Basado en tus respuestas, ajusto el modelo y la UI para reflejar las reglas reales del negocio.

---

## 1) Comisión / Honorarios administrativos

**Estado hoy:** ya se calcula `alquiler * comision_porcentaje / 100` (sobre bruto). El % vive por contrato.

**Cambios:** solo aclarar en la UI del contrato que es "comisión sobre alquiler bruto". No se toca el modelo.

---

## 2) IVA y facturación (condicionado al medio de pago)

**Regla:** el IVA sobre la comisión se aplica **solo si el pago es por transferencia** (porque obliga a facturar). Efectivo/cheque → sin IVA.

**Cambios DB en `pagos`:**
- `genera_factura boolean default false`
- `tipo_factura text` (`'A' | 'B' | null`)
- `numero_factura text`
- `iva_comision numeric default 0` (IVA proporcional sobre la comisión de este pago)

`contratos.iva` queda como legacy.

**Cambios UI:**
- `RegistrarPagoDialog`: si medio = Transferencia → bloque "Facturación" con tipo A/B, número, e IVA calculado automáticamente sobre la comisión proporcional al pago.
- `LiquidacionDetalle`: nueva fila "IVA s/ comisión" en el resumen (suma de IVAs de pagos confirmados).

---

## 3) Mora — interés diario acumulable

**Cambios DB en `contratos`:**
- `tasa_mora_diaria numeric default 0` (% diario)
- `dias_gracia_mora int default 0`

**Funciones SQL:**
- `calcular_punitorio(_liq_id, _fecha)` → interés compuesto día a día sobre el pendiente: `pendiente * ((1 + tasa/100)^dias - 1)`.
- `aplicar_punitorios(_liq_id)` → inserta concepto "Punitorios por mora", recalcula totales y registra evento.

**Cambios UI:**
- `LiquidacionDetalle`: si vencida y pendiente → badge "En mora — X días" + botón "Aplicar punitorios al día de hoy". Mostrar punitorios ya aplicados con fecha.
- `NuevoContrato` y detalle de contrato: campos de tasa diaria y días de gracia.

---

## 4) Rendición al propietario (esperar acreditación)

**Nuevo estado en enum `estado_liquidacion`:** `Acreditada` (entre `Cobrada` y `Transferida`).

Ciclo:
- `Pendiente` → `Parcial` → `Cobrada` (cobrado al inquilino, pendiente acreditación) → `Acreditada` (fondos disponibles) → `Transferida` (rendido al propietario).

**Nueva tabla `rendiciones_propietario`:**
```
id, liquidacion_id, propietario_id, fecha_acreditacion,
fecha_transferencia, monto_neto, comision_retenida,
iva_retenido, medio, referencia, comprobante_url,
observaciones, created_at
```

**Funciones SQL:** `marcar_acreditada(_liq_id, _fecha)` y `rendir_propietario(_liq_id, _fecha, _medio, _referencia, _comprobante_url)`.

**Cambios UI:**
- `LiquidacionDetalle`:
  - `Cobrada` → botón "Marcar acreditada" (con fecha).
  - `Acreditada` → botón "Rendir al propietario" → nuevo `RendirPropietarioDialog` (monto neto, fecha, medio, referencia, comprobante).
- Nueva pantalla `/rendiciones` con filtros por propietario, período y estado.
- `Dashboard`: tarjeta "Pendientes de rendir" = liquidaciones en `Acreditada`.

---

## 5) GenerarLiquidacion — ajustes menores

- Reemplazar el dropdown hardcodeado de períodos por selector dinámico (últimos 12 meses + 3 futuros).
- Quitar el bloque "IVA 21% sobre subtotal" del resumen (ahora es por pago).
- Mostrar mora estimada al día de hoy si el período ya venció.

---

## Orden de implementación

1. Migración DB: nuevo enum `Acreditada`, columnas en `contratos` (mora) y `pagos` (factura), tabla `rendiciones_propietario`, bucket privado `rendiciones`.
2. Funciones SQL: `calcular_punitorio`, `aplicar_punitorios`, `marcar_acreditada`, `rendir_propietario`.
3. UI: `RegistrarPagoDialog` (facturación condicional), `LiquidacionDetalle` (mora + acreditación + rendición), `GenerarLiquidacion` (período dinámico).
4. Nueva pantalla `/rendiciones` + tarjeta en Dashboard.
5. Campos de mora en pantallas de contrato.

---

## Notas técnicas

- RLS: tablas nuevas siguen el patrón `auth_*` salvo `rendiciones_propietario` (insert/update solo admin).
- Bucket `rendiciones` privado, lectura para autenticados.
- Funciones `SECURITY DEFINER`, registran en `eventos_contrato` y `auditoria`.
- `contratos.iva` queda como legacy (no se elimina).
