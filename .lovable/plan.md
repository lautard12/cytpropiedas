## Objetivo

Hoy una liquidación se cobra de golpe (un pago = liquidación cobrada). El usuario quiere ir **tildando conceptos** a medida que el inquilino avisa pagos parciales, y que la liquidación se vaya "completando" sola. En el listado debe verse cuántos conceptos faltan por cobrar.

## Cambios funcionales

### 1. Conceptos cobrables individualmente
- Cada fila de "Conceptos del período" en `LiquidacionDetalle` lleva un checkbox.
- Solo se pueden tildar conceptos con `aplica_al_inquilino = true` (los del propietario no se cobran, no se tildan).
- Tildar **NO** crea pago todavía. Solo marca el concepto como "Pendiente de imputar".
- Se puede destildar mientras no haya pago imputado.

### 2. Pago agrupado de los tildados
- Botón **"Registrar pago de seleccionados"** arriba de la tabla de conceptos, habilitado cuando hay ≥1 tildado y sin pago previo.
- Abre el `RegistrarPagoDialog` con el monto pre-cargado = suma de tildados, fecha/medio/referencia editables.
- Al confirmar: se crea 1 fila en `pagos` (lump) y se marca cada concepto tildado como `cobrado_at = now()`, `pago_id = <id>`.
- Una vez imputados, esos conceptos quedan bloqueados (✓ verde, sin checkbox).

### 3. Estados derivados de la liquidación
- **Borrador/Pendiente**: ningún concepto cobrado.
- **Parcial**: ≥1 concepto cobrado, faltan otros.
- **Cobrada**: todos los conceptos del inquilino cobrados.
- El cálculo de `total_cobrado` y `pendiente` ya existe en `anular_pago` — se reusa la lógica server-side.

### 4. Indicador "X/Y conceptos" en listado
- Nueva columna en `Liquidaciones.tsx` entre "Cobrado" y "Estado": muestra `3/5` + mini-barra de progreso.
- Color de la barra: gris si 0, amarillo si parcial, verde si completo.
- Tooltip al hover: "Faltan: Expensas, ABL".

### 5. Anulación de pago
- Al anular un pago, los conceptos asociados (`pago_id = X`) vuelven a destildados y disponibles para tildar de nuevo.

## Cambios técnicos

### DB (migración)
```sql
ALTER TABLE public.conceptos_liquidacion
  ADD COLUMN cobrado_at timestamptz,
  ADD COLUMN pago_id uuid;

-- Helper: marcar conceptos cobrados al crear pago
CREATE OR REPLACE FUNCTION public.imputar_pago_a_conceptos(
  _pago_id uuid, _concepto_ids uuid[]
) RETURNS void ...

-- Modificar anular_pago: liberar conceptos
UPDATE public.conceptos_liquidacion
  SET cobrado_at = NULL, pago_id = NULL
  WHERE pago_id = _pago_id;
```

### Frontend
- `src/pages/LiquidacionDetalle.tsx`: agregar checkbox por concepto, botón "Cobrar seleccionados", estado local de tildados, lock visual de cobrados.
- `src/components/RegistrarPagoDialog.tsx`: aceptar prop `conceptoIds: string[]` y pasarla al insert/RPC.
- `src/pages/Liquidaciones.tsx`: columna `Cobrado X/Y` con `<Progress>` de shadcn + tooltip.
- `src/hooks/useSupabaseData.ts`: el hook `useConceptosLiquidacion` ya trae los conceptos — solo se agregan los campos nuevos al type.

## Fuera de alcance
- Pagos parciales por concepto (decidido: todo o nada).
- Badge en sidebar (decidido: solo columna en la tabla).
- Editar el monto de un concepto desde el detalle.
