## Continuar implementación modalidad de cobro

Completar las tareas pendientes del flujo de dos modalidades (Inmobiliaria vs Propietario).

### 1. `LiquidacionDetalle.tsx` — finalizar UI
- Montar `<CobrarComisionDialog />` con props (`cobroId`, `liquidacionId`, `open`, `onOpenChange`).
- Estado local `cobrarComisionOpen` y handler que dispara el dialog cuando hay `cobroComision` pendiente.
- Reemplazar bloque "Neto propietario" por **"A cobrar al propietario"** cuando `destino_cobro === 'Propietario'`:
  - Comisión inmobiliaria
  - IVA s/comisión
  - Gastos a reintegrar (editable luego en el dialog)
  - Total a cobrar al propietario
- Card "Cobro de comisión" cuando exista registro en `cobros_comision_propietario`: estado (Pendiente/Cobrada), fecha, medio, referencia, comprobante.
- En estado terminal `Transferida`: mostrar "Comisión cobrada" en modo Propietario, "Transferida al propietario" en modo Inmobiliaria.

### 2. `Liquidaciones.tsx` — listado
- Badge de Modalidad (azul Inmobiliaria / ámbar Propietario) en cada fila.
- Label del estado terminal adaptado por modalidad.
- Tooltip explicativo en el badge.

### 3. `NuevoContrato.tsx` y `ContratoDetalle.tsx`
- Agregar `Select` para `destino_cobro` con dos opciones y textos de ayuda:
  - **Cobra la inmobiliaria** — "El inquilino paga a la inmobiliaria, que luego rinde al propietario."
  - **Cobra el propietario** — "El inquilino paga directo al propietario; la inmobiliaria solo cobra su comisión."
- Default `'Inmobiliaria'`. Mostrar valor actual en detalle del contrato.

### 4. `Rendiciones.tsx` (página actual del usuario)
- Verificar que solo liste modalidad Inmobiliaria (rendiciones reales).
- Agregar sección/tab paralelo o página `CobrosComision` para listar `cobros_comision_propietario` pendientes y cobradas, con acción "Cobrar comisión".

### Fuera de alcance
- Migración de liquidaciones históricas.
- Cambios en cálculo de moras/punitorios por modalidad.
- Reportería consolidada (revenue) — solo se respeta el filtro `tipo='cobranza'` ya implementado.
