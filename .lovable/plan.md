

# Plan: Evolución del Historial — Sistema CyT Propiedades (Revisado)

## Paso 1: Nueva tabla `eventos_contrato`

Migración SQL:

```text
eventos_contrato
├── id (uuid PK)
├── contrato_id (uuid, NOT NULL)
├── liquidacion_id (uuid, NULLABLE) — vincula evento a liquidación específica
├── periodo (text, NULLABLE) — ej: "2025-03", alternativa cuando no hay liquidación creada
├── fecha (date, NOT NULL)
├── tipo (text) — detalle fino: 'inicio_contrato', 'renovacion', 'ajuste_alquiler', 'cambio_comision', 'cambio_responsable', 'rescision', 'finalizacion', 'deposito_garantia', 'punitorio', 'bonificacion', 'descuento', 'honorarios', 'gasto_especial', 'observacion', 'acuerdo', 'comprobante'
├── categoria (text) — 'contractual' | 'financiero' | 'administrativo' | 'documental'
├── descripcion (text)
├── monto (numeric, nullable)
├── documento_url (text, nullable, mock)
├── created_at (timestamptz)
```

Categorías:
- **contractual**: inicio, renovación, ajuste alquiler, cambio comisión, cambio responsable, rescisión, finalización
- **financiero**: depósito garantía, punitorio, bonificación, descuento, honorarios, gasto especial
- **administrativo**: observación, acuerdo
- **documental**: comprobante

RLS pública (MVP/demo). Nota en comentario SQL: "MVP only — restrict for production".

## Paso 2: Mock data con historial realista

INSERT via herramienta de datos:
- CT-2024-001: inicio mar 2024, ajuste ICL sep 2024, renovación mar 2025, depósito garantía, observación
- CT-2024-002: inicio, cambio comisión 10%→8%, punitorio ene 2025 (vinculado a periodo "2025-01"), bonificación
- CT-2024-008: inicio, cambio responsable TGI, gasto especial reparación
- CT-2023-015: inicio 2023, rescisión anticipada, acuerdo devolución depósito
- Liquidaciones adicionales ene/feb 2025 para crear historial mensual real

## Paso 3: Hooks en `useSupabaseData.ts`

- Tipo `EventoContrato` con los campos nuevos (incluyendo `liquidacion_id`, `periodo`, `categoria` con 4 valores)
- `useEventosContrato(contratoId)` — eventos de un contrato, orden fecha desc
- `useEventosPorPeriodo(contratoId, periodo)` — eventos vinculados a un período específico (por `periodo` o `liquidacion_id`)
- `useEventosRecientes(limit)` — últimos N eventos globales
- `useContratosByPropiedad(propiedadId)` — todos los contratos de una propiedad

## Paso 4: `ContratoDetalle.tsx` — Pantalla estrella

Estructura con Tabs: **Resumen** | **Historial**

**Tab Resumen** (default): contenido actual — partes, condiciones, reglas.

**Tab Historial** — orden fijo, de arriba a abajo:

1. **Resumen ejecutivo** — 4-5 cards: meses de vigencia, total cobrado acumulado, pendiente actual, comisión acumulada, cantidad de eventos
2. **Historial contractual** — Timeline vertical filtrada por `categoria = 'contractual'`. Íconos por tipo. Fecha + badge tipo + descripción.
3. **Historial mensual financiero** — Tabla con cards resumen arriba. Período, estado (badge), total liquidado, cobrado, pendiente, comisión, neto propietario. Click → detalle liquidación.
4. **Eventos especiales** — Lista cronológica de `categoria IN ('financiero', 'administrativo', 'documental')`. Cards con fecha, badge categoría/tipo, monto opcional, descripción. Empty state elegante.

## Paso 5: `PropiedadDetalle.tsx` — Tab Historial mejorada

- Cards ejecutivas: contratos históricos, deuda actual, última liquidación, último pago, próximo vencimiento
- Lista de contratos asociados con link al detalle
- Banner: "El historial detallado se gestiona por contrato"

## Paso 6: `LiquidacionDetalle.tsx` — Fortalecer

- Navegación anterior/siguiente (mismo contrato)
- Mini timeline de pagos
- Bloque "Eventos del período": filtra `eventos_contrato` por `periodo` o `liquidacion_id` matching

## Paso 7: Dashboard — Card "Trazabilidad"

- Card "Últimos movimientos" con 8-10 eventos recientes
- Fecha, tipo (badge), contrato (link), descripción

## Paso 8: Reportes — Contratos con cambios recientes

- Card con contratos que tuvieron eventos en el último mes

## Archivos a modificar/crear

| Archivo | Cambio |
|---|---|
| Migración SQL | Tabla `eventos_contrato` con `liquidacion_id`, `periodo`, 4 categorías |
| INSERT datos | Mock data historial rico |
| `useSupabaseData.ts` | Tipos + 4 hooks nuevos |
| `ContratoDetalle.tsx` | Refactor con Tabs, resumen ejecutivo + 3 bloques historial |
| `PropiedadDetalle.tsx` | Tab Historial con resumen ejecutivo |
| `LiquidacionDetalle.tsx` | Nav prev/next, timeline pagos, eventos del período |
| `Dashboard.tsx` | Card trazabilidad |
| `Reportes.tsx` | Card cambios recientes |

