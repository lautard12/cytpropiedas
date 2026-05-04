
# Plan: Notificación de cobro, mora con autorización y medios de pago pactados

Basado en tus respuestas, cubrimos 4 aspectos del circuito de cobranza.

---

## 1) Medios de pago pactados por contrato

Hoy el `RegistrarPagoDialog` muestra los 5 medios siempre. Como cada inquilino tiene un acuerdo fijo, lo pactamos en el contrato y filtramos los medios al registrar pagos.

**DB (`contratos`):**
- `medios_pago_aceptados text[]` — array con los medios pactados (ej: `{Transferencia, Efectivo}`).
- `destino_cobro text` — `'Inmobiliaria' | 'Propietario'` (a quién va dirigida la transferencia).

**UI:**
- `NuevoContrato` paso "Reglas": multi-checkbox de medios aceptados + radio destino del cobro.
- `RegistrarPagoDialog`: el `Select` de medio se filtra por los pactados. Cartel "Acuerdo: pagar a {Inmobiliaria/Propietario}".
- `ContratoDetalle`: mostrar medios y destino en el resumen de configuración.

---

## 2) Mora — flujo con autorización del propietario

Hoy hay un botón "Aplicar punitorios" directo. Pero la realidad es: **vencimiento siempre día 10, sin gracia**, y **antes de aplicar mora hay que consultar al propietario**.

**DB:**
- Nueva tabla `consultas_mora`:
  ```
  id, liquidacion_id, contrato_id, fecha_consulta,
  monto_estimado, dias_atraso,
  estado text ('Pendiente' | 'Aprobada' | 'Rechazada'),
  fecha_respuesta, observaciones, decidido_por
  ```
- `dias_gracia_mora = 0` por defecto (ya está).

**Funciones SQL:**
- `solicitar_autorizacion_mora(_liq_id)` — crea consulta `Pendiente` + evento.
- `resolver_consulta_mora(_consulta_id, _aprobada bool, _obs)` — si aprobada llama a `aplicar_punitorios`; si rechazada solo registra evento "punitorio condonado".

**UI en `LiquidacionDetalle`** (reemplaza el alert de mora actual):
- **Sin consulta:** botón "Consultar al propietario" (dialog con resumen + observación).
- **Pendiente:** badge "Esperando respuesta del propietario" + botones "Aprobar" / "Rechazar".
- **Aprobada:** ejecuta `aplicar_punitorios` y muestra el concepto agregado.
- **Rechazada:** muestra "Punitorio condonado por el propietario" con fecha y observación.

---

## 3) Notificación al inquilino — solo WhatsApp (manual)

**Sin email por ahora** (lo dejamos para una siguiente etapa).

**UI:**
- Botón "Avisar por WhatsApp" en `LiquidacionDetalle` cuando estado es `Pendiente` o `Parcial`.
- Genera link `https://wa.me/{telefono}?text={mensaje}` con plantilla:
  > Hola {inquilino}, te recordamos que la liquidación de {periodo} de {direccion} vence el día {dia_venc}. Total: {monto}. Saldo pendiente: {pendiente}. Gracias!
- Toma el teléfono del inquilino (`personas.telefono`); si no hay, deshabilita con tooltip.
- Registra evento `notificacion_enviada` (canal: WhatsApp) en `eventos_contrato` para tener trazabilidad de avisos enviados.

---

## 4) Pagos parciales — ajuste menor

Hoy ya soporta pagos parciales (estado `Parcial`). Como aclaraste que **no es habitual y la mora se aplica solo sobre el faltante** (que ya es lo que hace), agrego solo:
- En el dialog de pago, cuando se ingresa monto parcial: aclaración "Si el faltante se abona después del día {dia_venc}, se podrán aplicar punitorios sobre ese saldo (previa consulta al propietario)".
- En el alert de mora: mostrar la fecha del último pago parcial confirmado para contexto.

---

## Orden de implementación

1. **Migración DB:** columnas en `contratos` (medios + destino), tabla `consultas_mora`, funciones `solicitar_autorizacion_mora` y `resolver_consulta_mora`.
2. **Medios pactados:** UI en `NuevoContrato`, `RegistrarPagoDialog` y `ContratoDetalle`.
3. **Mora con autorización:** rehacer alert en `LiquidacionDetalle` + nuevo `ConsultarMoraDialog`.
4. **WhatsApp:** botón + generación de link + evento de auditoría.
5. **Ajustes menores en pagos parciales.**

---

¿Avanzamos?
