

# Plan Revisado - Sistema de Administración Inmobiliaria MVP

Se incorporan los 3 refuerzos solicitados transversalmente en todo el sistema.

---

## Cambio 1: Liquidación = Contrato + Período (no propiedad)

**Naming y textos en toda la app:**
- Siempre "Liquidación del contrato [código] - Período [mes/año]", nunca "Liquidación de [dirección]"
- En tablas de liquidaciones: columna principal es "Contrato", la propiedad aparece como dato secundario
- Header de detalle de liquidación: "Liquidación mensual — Contrato CT-2024-001 — Período Marzo 2025" con la dirección debajo como contexto
- Breadcrumb: Dashboard > Liquidaciones > CT-2024-001 > Marzo 2025
- En el modal "Generar liquidación mensual": el selector principal es el contrato, la propiedad se autocompleta
- En detalle de propiedad, tab Liquidaciones: tabla titulada "Liquidaciones del contrato vigente" con nota "Contrato CT-2024-001 — vigente desde 01/03/2024"

**Relaciones visuales:**
- Badge del contrato visible en cada liquidación (chip clickeable que lleva al contrato)
- En detalle de liquidación, bloque lateral "Contrato asociado" con reglas aplicadas visibles

---

## Cambio 2: Tab "Configuración Contractual Vigente" en Propiedad

**Renombrar** la tab de "Configuración" a **"Configuración Contractual Vigente"**

**Contenido:**
- Banner superior: "Estas reglas corresponden al contrato vigente CT-2024-001 (01/03/2024 - 28/02/2026). Al finalizar este contrato, un nuevo contrato podrá tener reglas diferentes."
- Link directo al contrato desde el banner
- Cards con los parámetros (comisión %, IVA, TGI, API, expensas, seguro, servicios, observaciones) pero con el encabezado "Reglas del contrato vigente", no "Configuración de la propiedad"
- Si la unidad no tiene contrato activo: empty state "Esta unidad no tiene un contrato vigente. Las reglas se configuran al crear un nuevo contrato."

---

## Cambio 3: Resultado financiero de la inmobiliaria prominente

### Dashboard - Bloque "Resultado del Mes" reforzado

KPIs superiores (6 cards, misma fila):
- Total Cobrado del Mes
- Pendiente de Cobro
- **Comisión de Administración** (destacado con ícono y color azul)
- **Neto a Transferir a Propietarios**
- Contratos Activos
- Inquilinos en Mora

**Nuevo bloque "Resultado Financiero de la Administración"** — card grande, prominente, debajo de los KPIs:

```text
┌─────────────────────────────────────────────────────┐
│  RESULTADO FINANCIERO - MARZO 2025                  │
│                                                     │
│  Total cobrado              $4.850.000              │
│  (-) Neto propietarios      $4.120.000              │
│  (-) Gastos retenidos         $245.000              │
│  ─────────────────────────────────────              │
│  = Comisión inmobiliaria      $485.000              │
│  = Saldo administración       $485.000   ← verde   │
│                                                     │
│  Pendiente de cobro           $620.000   ← amarillo │
│  Pendiente de transferencia   $310.000   ← amarillo │
└─────────────────────────────────────────────────────┘
```

### Reportes - Sección "Resultado de la Administración"

Card principal en Reportes con la misma lógica desglosada, más:
- Tabla "Comisión por contrato" (cuánto genera cada contrato de comisión)
- Gráfico de evolución mensual: comisión vs neto propietarios vs total cobrado
- Filtrable por mes, propietario, unidad

---

## Resumen de impacto en archivos

Todo lo anterior se implementa dentro de la misma estructura de archivos del plan original. Los cambios son de naming, textos, relaciones visuales y un bloque nuevo en Dashboard/Reportes. No se agregan pantallas nuevas.

**Archivos afectados respecto al plan original:**
- `mockData.ts` — agregar campo `contratoId` como relación principal en liquidaciones
- `Dashboard.tsx` — bloque "Resultado Financiero de la Administración"
- `LiquidacionDetalle.tsx` — header con contrato como protagonista, propiedad secundaria
- `LiquidacionesListado.tsx` — contrato como columna principal
- `GenerarLiquidacion.tsx` — selector de contrato como campo principal
- `PropiedadDetalle.tsx` — tab renombrada, banner de contrato vigente, empty state
- `Reportes.tsx` — sección resultado administración con tabla comisión por contrato
- Breadcrumbs y labels en general — reflejar "Contrato + Período"

