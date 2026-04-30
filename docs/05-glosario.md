# 5. Glosario

| Término | Definición |
|---|---|
| **Alquiler base** | Monto mensual pactado al inicio del contrato, antes de ajustes. |
| **API** | Aporte Patronal Inmobiliario (Santa Fe). En el modelo: campo de regla por contrato indicando quién lo paga. |
| **TGI** | Tasa General de Inmuebles (impuesto municipal). |
| **ABL** | Alumbrado, Barrido y Limpieza (CABA). Equivalente a TGI en otras jurisdicciones. |
| **Comisión inmobiliaria** | Porcentaje que retiene la administradora sobre el alquiler cobrado. Configurable por contrato. |
| **IVA sobre comisión** | Si el contrato es comercial o la administradora factura con IVA. |
| **ICL** | Índice de Contratos de Locación (BCRA). Usado para ajustar alquileres. |
| **IPC** | Índice de Precios al Consumidor (INDEC). Alternativa de ajuste. |
| **Frecuencia de ajuste** | Cada cuántos meses se aplica el ICL/IPC al alquiler base. |
| **Liquidación** | Cuenta mensual emitida a un inquilino por un período específico de un contrato. |
| **Período** | Mes calendario en formato `YYYY-MM` al que corresponde la liquidación. |
| **Concepto** | Línea de la liquidación (alquiler, expensas, ABL, multa, ajuste...). |
| **Saldo anterior** | Monto adeudado de períodos previos arrastrado a la liquidación actual. |
| **Total a cobrar** | Suma de conceptos al inquilino + saldo anterior. |
| **Total cobrado** | Suma de pagos confirmados aplicados a la liquidación. |
| **Pendiente** | `total_cobrar − total_cobrado`. |
| **Neto al propietario** | Monto a transferir al dueño después de descontar comisión y conceptos a su cargo. |
| **Estado Borrador** | Liquidación creada pero aún no emitida formalmente. |
| **Estado Pendiente** | Emitida, sin pagos aplicados todavía. |
| **Estado Parcial** | Tiene pagos pero aún hay saldo. |
| **Estado Cobrada** | `pendiente = 0`. |
| **Estado Transferida** | El neto ya fue rendido al propietario. |
| **Estado Anulada** | Liquidación dejada sin efecto (manual). |
| **Garante** | Tercero que respalda al inquilino. Datos en `inquilinos.garante_*`. |
| **Rendición** | Acción de transferir al propietario el neto cobrado. |
| **Evento de contrato** | Entrada en la bitácora histórica del contrato (financiero, contractual, administrativo o documental). |
| **Anulación de pago** | RPC `anular_pago` que marca el pago como `Anulado`, recalcula la liquidación, registra evento y entrada de auditoría. |
| **Rol de dominio** | Cualidad de la persona derivada de su pertenencia a `propietarios` / `inquilinos`. **No se persiste**. |
| **Rol de aplicación** | Permiso del usuario en el sistema (`admin`, `administrativo`). Se persiste en `user_roles`. |
| **Personal / legajo** | Vínculo de una persona con una sucursal en la tabla `personal`, con `fecha_alta` / `causa_alta` / `fecha_baja` / `causa_baja`. |
| **Causa de alta** | Motivo de incorporación. Por defecto: `Alta Personal`. |
| **Causa de baja** | Motivo de desvinculación: `Renuncia`, `Despido`, `Jubilación`, `Fallecimiento`, `Fin de contrato`, `Otro`. |
| **Sucursal central** | Sucursal marcada como `es_central = true`; se crea por seed y no se puede eliminar. |
| **Auditoría** | Registro inmutable (solo INSERT y SELECT) de cambios sensibles. Visible en `/auditoria` solo para admin. |
