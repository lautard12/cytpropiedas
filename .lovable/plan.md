
## Objetivo

Soportar dos modalidades de cobro definidas a nivel **contrato** y congeladas en cada **liquidación**:

- **Cobra la inmobiliaria** (flujo actual): inquilino paga a la inmobiliaria → acreditación → rendición del neto al propietario.
- **Cobra el propietario** (nuevo): inquilino paga directo al propietario → la inmobiliaria registra esa novedad y luego le **cobra la comisión + IVA + gastos** al propietario.

`contratos.destino_cobro` ya existe (default `'Inmobiliaria'`); solo se muestra. Resto del sistema lo ignora.

## Cambios

### 1. Base de datos (una migración)

- **`liquidaciones.destino_cobro`** `text NOT NULL DEFAULT 'Inmobiliaria'`. Snapshot histórico — no se actualiza si el contrato cambia.
- **`pagos.tipo`** `text NOT NULL DEFAULT 'cobranza'` con valores `'cobranza' | 'pago_directo_propietario'`. Los segundos imputan conceptos y mueven la liquidación a `Cobrada`, pero quedan excluidos de cualquier reporte de caja/banco/recaudación.
- **Tabla `cobros_comision_propietario`** con los campos pedidos + `UNIQUE(liquidacion_id)` (un solo cobro por liquidación). GRANTs + RLS (lectura `authenticated`; insert/update/delete admin).
- **RPC `confirmar_cobro_comision(_cobro_id, _fecha, _medio, _referencia, _comprobante_url, _observaciones)`**: marca el cobro como `Cobrada`, transiciona la liquidación a un estado terminal (reusamos `'Transferida'` en DB para no tocar el enum; la UI lo muestra como "Comisión cobrada"), inserta evento `comision_cobrada`.
- **Trigger en `liquidaciones`**: cuando `estado` pasa a `'Cobrada'` y `destino_cobro='Propietario'`, hace `INSERT ... ON CONFLICT (liquidacion_id) DO NOTHING` en `cobros_comision_propietario` con `total_cobrar = comision_inmobiliaria + iva_proporcional + gastos_reintegro_default(0)`. Idempotente.
- **Generación de liquidación**: el insert en `GenerarLiquidacion.tsx` agrega `destino_cobro: contrato.destino_cobro ?? 'Inmobiliaria'`.
- **`rendir_propietario` y `marcar_acreditada`**: agregar guard `IF _liq.destino_cobro = 'Propietario' THEN RAISE EXCEPTION '...'`.
- **`anular_pago`**: cuando libera conceptos, si el cobro de comisión asociado a esa liquidación está `Pendiente` y la liquidación deja de estar `Cobrada`, lo borra (también idempotente).

### 2. Hook `useSupabaseData.ts`

- Agregar `destino_cobro` al type `Liquidacion`, `tipo` al type `Pago`, y nuevo type/hook `useCobroComisionByLiquidacion(liquidacionId)`.

### 3. `RegistrarPagoDialog.tsx`

Nueva prop `modalidadCobro?: 'Inmobiliaria' | 'Propietario'`. Cuando es `'Propietario'`:

- Título: "Registrar pago directo al propietario".
- Banner informativo: "Este registro no representa ingreso de dinero a la inmobiliaria".
- Oculta selector de medio de pago, switch de facturación, campos de IVA y tipo/número de factura.
- Inserta `pagos.tipo = 'pago_directo_propietario'`, `medio_pago = 'Transferencia'` (placeholder), `iva_comision = 0`, `genera_factura = false`.
- Mantiene la imputación de `conceptoIds` y el recálculo de `total_cobrado/pendiente/estado`.

### 4. `LiquidacionDetalle.tsx`

- Badge de modalidad al lado del estado: azul "Cobra la inmobiliaria" | ámbar "Cobra el propietario".
- Header de acciones condicional por `liq.destino_cobro`:
  - **Inmobiliaria**: igual que hoy (Registrar pago, Marcar acreditada, Rendir al propietario).
  - **Propietario**: "Registrar pago directo al propietario" en Pendiente/Parcial/Borrador; cuando hay cobro de comisión `Pendiente` → "Cobrar comisión al propietario"; nunca aparece "Rendir al propietario" ni "Marcar acreditada".
- Tarjeta **Resumen económico** se bifurca:
  - **Inmobiliaria**: igual que hoy (subtotal, total a cobrar, cobrado, pendiente, comisión, IVA, neto propietario).
  - **Propietario**: tras el bloque de cobranza al inquilino, en lugar de "Neto propietario" muestra un sub-card **"A cobrar al propietario"** con: comisión inmobiliaria, IVA s/ comisión, gastos a reintegrar (editable inline antes de confirmar el cobro), total a cobrar, badge `Pendiente | Cobrada`, y datos del cobro (fecha/medio/ref) cuando esté confirmado.
- Estado terminal: si modalidad = Propietario, en lugar del label "Transferida" mostramos "Comisión cobrada".

### 5. Nuevo `CobrarComisionDialog.tsx`

Espejo de `RendirPropietarioDialog`: fecha, medio, referencia, comprobante (bucket `rendiciones`), observaciones. Llama `confirmar_cobro_comision`. Permite ajustar `monto_gastos_reintegro` antes de confirmar (vuelve a calcular `total_cobrar`).

### 6. `Liquidaciones.tsx` (lista)

- Nueva columna o sub-badge **Modalidad** ("Inmobiliaria" / "Propietario").
- En la columna Estado, cuando `estado='Transferida'`:
  - Modalidad Inmobiliaria → texto "Rendida".
  - Modalidad Propietario → texto "Comisión cobrada".

### 7. `NuevoContrato.tsx` y `ContratoDetalle.tsx`

- En alta y edición de contrato: `Select` para `destino_cobro` con helper text:
  - **Cobra la inmobiliaria**: el inquilino paga a la inmobiliaria y luego se rinde al propietario.
  - **Cobra el propietario**: el inquilino paga directo al propietario y luego la inmobiliaria cobra su comisión.
- `ContratoDetalle` muestra el badge correspondiente.

## Reglas firmes

- En modalidad Propietario, **nunca** usar la palabra "rendición" en UI ni en eventos.
- En modalidad Propietario, los `pagos.tipo='pago_directo_propietario'` no se suman en reportes de caja/banco/recaudación (Reportes y Dashboard filtran por `tipo='cobranza'`).
- En modalidad Propietario, el cierre financiero es el cobro de comisión.
- En modalidad Inmobiliaria, el cierre financiero es la rendición (sin cambios).

## Fuera de alcance

- Migrar liquidaciones viejas: quedan con `destino_cobro='Inmobiliaria'` por default.
- Facturación AFIP automática del cobro de comisión (solo guardamos número/tipo si se ingresa más adelante).
- Cambiar el enum `estado_liquidacion` — reutilizamos `'Transferida'` como estado terminal común con label distinto por modalidad.
- Tocar la lógica de mora/punitorios.

## Diagrama

```text
                  Liquidación Pendiente
                          │
              Tildado conceptos + Pago
                          │
                      Cobrada
                ┌─────────┴─────────┐
   destino=Inmobiliaria      destino=Propietario
        │                         │  (trigger crea
   Marcar acreditada              │   cobro_comision
        │                         │   pendiente, idempotente)
    Acreditada              Cobro Pendiente
        │                         │
   Rendir propietario      Cobrar comisión propietario
        │                         │
  Transferida (Rendida)   Transferida (Comisión cobrada)
```
