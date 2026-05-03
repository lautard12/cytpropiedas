
# Plan — Adaptar contratos al feedback de clientes

Basado en las respuestas de los clientes, hay que extender el modelo de **contratos** para soportar:

1. **Múltiples tipos de contrato** (vivienda, comercial, temporario) con cláusulas variables.
2. **Índice de ajuste** acotado a un set realista (ICL, IPC, libre acuerdo).
3. **Frecuencia de ajuste flexible** (trimestral por defecto, configurable).
4. **Multi-moneda** (ARS y USD) en alquiler, liquidaciones y pagos.

---

## 1. Cambios de base de datos (migración)

### Nuevos enums
```sql
CREATE TYPE tipo_contrato  AS ENUM ('Vivienda','Comercial','Temporario');
CREATE TYPE moneda         AS ENUM ('ARS','USD');
CREATE TYPE indice_ajuste  AS ENUM ('ICL','IPC','Libre acuerdo');
```

### `contratos` — columnas nuevas
| Columna | Tipo | Default | Notas |
|---|---|---|---|
| `tipo_contrato` | `tipo_contrato` | `'Vivienda'` | reemplaza el uso libre |
| `moneda` | `moneda` | `'ARS'` | aplica a `alquiler_base` |
| `indice_ajuste` | `indice_ajuste` | `'ICL'` | reemplaza `tipo_ajuste` (texto libre) — se mantiene la columna vieja por compatibilidad y se sincroniza |
| `clausulas_particulares` | `text` | `''` | cláusulas específicas del contrato (libres) |

`frecuencia_ajuste` ya existe como `text` — se mantiene libre (trimestral / cuatrimestral / semestral / anual) porque "puede variar".

### `liquidaciones` y `pagos` — multi-moneda
- `liquidaciones`: agregar `moneda moneda NOT NULL DEFAULT 'ARS'` (heredada del contrato al emitir).
- `pagos`: agregar `moneda moneda NOT NULL DEFAULT 'ARS'` + `cotizacion numeric` (tipo de cambio aplicado si el pago se hace en moneda distinta a la del contrato; nullable).

### Backfill
- `contratos.tipo_contrato = 'Vivienda'` para los existentes.
- `contratos.moneda = 'ARS'`.
- `contratos.indice_ajuste`: derivar de `tipo_ajuste` viejo (`'ICL%'` → ICL, `'IPC%'` → IPC, resto → Libre acuerdo).
- `liquidaciones.moneda` y `pagos.moneda` ← `contratos.moneda`.

---

## 2. Cambios en frontend

### `src/pages/NuevoContrato.tsx` (wizard de alta)
- **Paso "Datos generales"**: agregar selectores
  - **Tipo de contrato**: Vivienda / Comercial / Temporario.
  - **Moneda**: ARS / USD (junto al input `alquiler_base`, mostrando símbolo correspondiente).
  - **Índice de ajuste**: ICL / IPC / Libre acuerdo (reemplaza el texto actual).
  - **Frecuencia**: Trimestral (default) / Cuatrimestral / Semestral / Anual.
- **Paso "Reglas"**: agregar textarea **"Cláusulas particulares"** (notas libres por contrato).
- Guardar los campos nuevos en el `INSERT`.

### `src/pages/Contratos.tsx` y `src/pages/ContratoDetalle.tsx`
- Mostrar **badge** del tipo de contrato y moneda.
- Formato de moneda: usar `formatCurrency` con prefijo `USD` cuando corresponda (ajustar helper en `useSupabaseData.ts`).
- Filtros en el listado: por tipo de contrato y por moneda.

### `src/hooks/useSupabaseData.ts`
- Extender `formatCurrency(monto, moneda?)` para aceptar moneda y mostrar `US$` o `$`.
- Extender los tipos derivados de `contratos`.

### `src/pages/GenerarLiquidacion.tsx` y `LiquidacionDetalle.tsx`
- Heredar `moneda` del contrato al crear la liquidación.
- Mostrar todos los montos con el símbolo correcto.

### `src/components/RegistrarPagoDialog.tsx`
- Mostrar moneda de la liquidación.
- Permitir registrar el pago en otra moneda → input adicional **cotización** que convierte para imputar al saldo.

---

## 3. Documentación a actualizar

- `docs/03-modelo-de-datos.md`: enums nuevos + columnas nuevas en `contratos`/`liquidaciones`/`pagos`.
- `docs/db/schema.sql`: reflejar los enums y columnas.
- `docs/diagramas/der.mmd`: agregar campos.
- `docs/flujos/01-alta-contrato.md`: incluir tipo, moneda, índice acotado.
- `docs/flujos/05-ajustes-icl-ipc.md`: ya está alineado a ICL/IPC, agregar nota sobre frecuencia variable y libre acuerdo.
- `docs/05-glosario.md`: definir Tipo de contrato, Moneda, Índice de ajuste.
- `docs/endpoints/contratos.md`: nuevos campos en payload.

---

## 4. Fuera de alcance (sugerencias para iteraciones futuras)

- **Plantillas de contrato** (vivienda/comercial/temporario) con cláusulas predefinidas seleccionables — pendiente de definir si se quiere editor de plantillas o sólo cláusulas libres por ahora (se implementa lo segundo).
- **Tabla `cotizaciones_usd`** para histórico de tipo de cambio oficial/MEP/blue (necesario sólo si quieren rendir USD valuados en ARS automáticamente).
- **Job de ajuste automático ICL/IPC** consultando API BCRA/INDEC (ya hay roadmap en `docs/flujos/05`).

¿Avanzamos con esta implementación o querés que incluya también plantillas de cláusulas predefinidas y la tabla de cotizaciones desde ya?
