## Objetivo

Extender la lógica de **conceptos de liquidación** para distinguir explícitamente entre **quién es responsable del gasto** y **quién lo pagó/adelantó**, derivando automáticamente el impacto correcto sobre la liquidación según la modalidad de cobro del contrato (`Inmobiliaria` / `Propietario`), sin romper datos históricos y sin permitir dobles descuentos.

---

## 1. Base de datos

### 1.1 Extender `conceptos_liquidacion`

Campos nuevos (todos con default seguro para registros existentes):

```text
pagado_por             text   DEFAULT 'Pendiente'
                       -- 'Inquilino' | 'Propietario' | 'Inmobiliaria' | 'Pendiente'
tipo_impacto           text   DEFAULT 'cobrar_al_inquilino'
                       -- 'cobrar_al_inquilino'
                       -- 'descontar_al_propietario'
                       -- 'reintegrar_al_inquilino'
                       -- 'reintegrar_al_propietario'
                       -- 'informativo'
periodo_impacto        text   DEFAULT 'Actual'           -- 'Actual' | 'ProximoPeriodo'
comprobante_url        text
observaciones          text   DEFAULT ''
concepto_relacionado_id uuid  REFERENCES conceptos_liquidacion(id)
                       -- vínculo 1:1 entre conceptos que compensan el mismo gasto
                       -- (ej.: descontar_al_propietario ↔ reintegrar_al_inquilino)
```

### Reglas duras

- **El campo `monto` siempre es positivo** (`CHECK (monto >= 0)`). El signo se deriva en cálculo a partir de `tipo_impacto`. Si en el código actual hay conceptos con monto negativo (ej.: "Descuentos"), se migran a `tipo_impacto='reintegrar_al_inquilino'` con monto positivo.
- `aplica_al_inquilino` queda **derivado** por trigger:
  ```text
  tipo_impacto ∈ {cobrar_al_inquilino, reintegrar_al_inquilino} → true
  resto → false
  ```
- `concepto_relacionado_id` es **opcional** pero recomendado: cada `reintegrar_al_*` apunta al concepto que está compensando (típicamente un `descontar_al_propietario` o un `cobrar_al_inquilino`). Constraint: ambos lados deben tener el mismo monto.

### Signos efectivos en cálculos

```text
cobrar_al_inquilino        →  +monto al inquilino
reintegrar_al_inquilino    →  −monto al inquilino
descontar_al_propietario   →  +monto a descontar/cobrar al propietario
reintegrar_al_propietario  →  +monto al inquilino  Y reconocimiento a favor del propietario
informativo                →   no afecta totales (queda como traza/evento)
```

### 1.2 Tabla nueva `conceptos_pendientes_contrato`

Reintegros y compensaciones diferidas al **próximo período** no se insertan en una liquidación futura inexistente. Se guardan acá y se vuelcan al generar la próxima:

```text
id                   uuid PK
contrato_id          uuid NOT NULL FK
origen_concepto_id   uuid FK conceptos_liquidacion(id)   -- de dónde vino
concepto             text NOT NULL
monto                numeric NOT NULL CHECK (monto >= 0)
tipo_impacto         text NOT NULL                       -- mismo enum lógico
pagado_por           text NOT NULL
observaciones        text DEFAULT ''
comprobante_url      text
estado               text NOT NULL DEFAULT 'Pendiente'    -- 'Pendiente'|'Aplicado'|'Anulado'
liquidacion_aplicada_id uuid FK liquidaciones(id)
fecha_aplicacion     date
created_at, updated_at
```

GRANTs habituales (`authenticated` CRUD + `service_role` ALL) + RLS abierto a `authenticated` (mismo patrón que `conceptos_liquidacion`).

Al **generar una nueva liquidación**, el procedimiento existente lee `conceptos_pendientes_contrato WHERE contrato_id=X AND estado='Pendiente'`, los inserta como `conceptos_liquidacion` del nuevo período, y los marca `Aplicado` con `liquidacion_aplicada_id` y `fecha_aplicacion`.

### 1.3 Función `recalcular_liquidacion(uuid)`

Centraliza el cálculo. Se invoca desde triggers en `conceptos_liquidacion` (INSERT/UPDATE/DELETE) y desde el flujo de pagos.

```text
-- Detalle al inquilino
subtotal_inquilino       = Σ cobrar_al_inquilino
reintegros_al_inquilino  = Σ reintegrar_al_inquilino  +  Σ reintegrar_al_propietario
                            (ambos reducen lo que paga el inquilino; el segundo
                             además se reconoce a favor del propietario)
total_cobrar_bruto       = subtotal_inquilino − reintegros_al_inquilino + saldo_anterior
total_cobrar             = GREATEST(0, total_cobrar_bruto)
saldo_a_favor_inquilino  = GREATEST(0, −total_cobrar_bruto)   -- arrastra al próx período

-- Detalle propietario
gastos_propietario_descontables   = Σ descontar_al_propietario
gastos_propietario_a_reintegrar   = Σ reintegrar_al_propietario
                                    (el inquilino los pagó al dueño;
                                     la inmobiliaria los reconoce al propietario)
comision    = alquiler_base * comision_% * (iva?1.21:1)

-- Modalidad Inmobiliaria
neto_propietario =
    total_cobrado
  − comision
  − gastos_propietario_descontables
  + gastos_propietario_a_reintegrar

-- Modalidad Propietario (cobro_comision_propietario)
total_cobrar_al_propietario =
    comision + iva_comision
  + gastos_propietario_descontables   -- los adelantó la inmobiliaria
  − gastos_propietario_a_reintegrar   -- el dueño ya cobró del inquilino
```

Si `total_cobrar_bruto < 0`, la liquidación queda con `total_cobrar = 0` y se crea automáticamente un `conceptos_pendientes_contrato` tipo `reintegrar_al_inquilino` por `saldo_a_favor_inquilino`, con observación *"Saldo a favor arrastrado del período {YYYY-MM}"*.

### 1.4 Validación anti-doble-descuento (por concepto)

**No es global.** La validación se hace **par a par** vía `concepto_relacionado_id`:

- Cuando se inserta un `reintegrar_al_inquilino`, si referencia un `descontar_al_propietario` del mismo gasto, ese `descontar_al_propietario` **se marca como ya compensado** y el cálculo de `gastos_propietario_descontables` lo **excluye** (queda solo el reintegro al inquilino como compensación, evitando descontar dos veces).
- Si no se referencia ningún concepto y la operadora intenta crear un reintegro mientras existe un descuento del mismo monto/proveedor en el mismo período sin vínculo, la UI advierte y pide confirmación o vincular.
- Constraint: dos conceptos vinculados deben tener el mismo `monto`.

---

## 2. Diálogo guiado “Agregar reparación / gasto”

Nuevo `src/components/ConceptoGastoDialog.tsx`. Reemplaza el array libre `extras` en `GenerarLiquidacion.tsx` y se abre también desde `LiquidacionDetalle.tsx` para conceptos post-emisión.

Preguntas en orden, **sin exponer `tipo_impacto`**:

1. **¿Qué tipo de gasto?** preset + descripción + monto (siempre positivo).
2. **¿A quién le corresponde?** `Inquilino` / `Propietario` / `Compartido` (si compartido, dividir en dos conceptos hijos automáticamente).
3. **¿Quién lo pagó?** `Inquilino` / `Propietario` / `Inmobiliaria` / `Pendiente`.
4. **¿En qué período impacta?** `Actual` / `Próximo período` (solo si hay reintegro).
5. **Comprobante** (file → bucket `comprobantes-gastos` privado) + **Observaciones**.
6. Si se está generando un reintegro: selector opcional **"compensa a este gasto"** con la lista de conceptos del mismo contrato sin vincular (para setear `concepto_relacionado_id`).

### Matriz de derivación

```text
Responsable | Pagado por   | tipo_impacto generado
------------+--------------+----------------------------------
Inquilino   | Inmobiliaria | cobrar_al_inquilino
Inquilino   | Inquilino    | informativo
Inquilino   | Propietario  | cobrar_al_inquilino  + reintegrar_al_propietario (vinculados)
Propietario | Inmobiliaria | descontar_al_propietario
Propietario | Inquilino    | reintegrar_al_inquilino (vinculado al descontar_al_propietario si existe)
Propietario | Propietario  | informativo
Compartido  | *            | se parte en dos conceptos hijos según las reglas
Cualquiera  | Pendiente    | informativo (queda en observaciones hasta definirse)
```

Si `periodo_impacto = 'ProximoPeriodo'` el concepto se inserta en `conceptos_pendientes_contrato` (estado `Pendiente`) y **no** en la liquidación actual.

---

## 3. Resumen económico (en `LiquidacionDetalle.tsx` y preview de `GenerarLiquidacion.tsx`)

```text
─ Inquilino
   Subtotal a cobrar al inquilino       $ ...
   Reintegros al inquilino             −$ ...
   Saldo anterior                       $ ...
   ────────────────
   Total a cobrar al inquilino          $ ...
   (Saldo a favor para próximo período) $ ...   ← si total_cobrar_bruto < 0

─ Propietario / Inmobiliaria
   Comisión inmobiliaria                $ ...
   IVA comisión                         $ ...
   Gastos a cargo del propietario       $ ...
   Gastos adelantados por inmobiliaria  $ ...
   Gastos a reintegrar al propietario   $ ...

   Modalidad Inmobiliaria:
      Total a rendir al propietario     $ ...
   Modalidad Propietario:
      Total a cobrar al propietario     $ ...
```

Cada línea con tooltip listando los conceptos que la componen.

---

## 4. Cambios de código

- `GenerarLiquidacion.tsx`: reemplazar `extras` por lista de tarjetas creadas vía `ConceptoGastoDialog`. Al cargar el contrato, leer también `conceptos_pendientes_contrato` y mostrarlos como tarjetas pre-incluidas (marcadas “arrastrado del período X”).
- `LiquidacionDetalle.tsx`: botón **“Agregar gasto/reparación”** que abre el mismo diálogo (en estados editables) e integra el nuevo resumen económico.
- `useSupabaseData.ts`: hook `useConceptosPendientes(contratoId)` + tipos actualizados de `ConceptoLiquidacion`.
- Storage: bucket privado `comprobantes-gastos`.

---

## 5. Migración de datos existentes

- `conceptos_liquidacion` con `monto < 0` → invertir signo y setear `tipo_impacto='reintegrar_al_inquilino'`.
- Resto de conceptos: `tipo_impacto` se deriva del `aplica_al_inquilino` actual (`true → cobrar_al_inquilino`, `false → descontar_al_propietario`). `pagado_por='Pendiente'` para no asumir nada.
- Liquidaciones ya cerradas/transferidas no se recalculan.

---

## 6. Documentación

Actualizar `docs/flujos/08-gastos-y-arreglos.md` con la matriz, los nuevos `tipo_impacto`, la regla de monto positivo, el manejo de pendientes diferidos y el caso de saldo a favor del inquilino. Nota en `docs/endpoints/liquidaciones.md` sobre los campos nuevos y `conceptos_pendientes_contrato`.

---

## Fuera de alcance

- Recalcular liquidaciones históricas ya rendidas.
- Workflow de aprobación de reintegros (queda solo la advertencia y el vínculo manual).
- Reportes consolidados con los nuevos rubros (próxima iteración).
