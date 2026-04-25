# 4. Pantallas

| Ruta | Archivo | Propósito | Datos consumidos |
|---|---|---|---|
| `/` | `Dashboard.tsx` | KPIs, evolución mensual, eventos recientes | `useLiquidaciones`, `usePagos`, `useContratos`, `useEventosRecientes` |
| `/propiedades` | `Propiedades.tsx` | Listado con filtros por estado/tipo | `usePropiedades`, `usePersonas` |
| `/propiedades/:id` | `PropiedadDetalle.tsx` | Ficha + contratos históricos | `usePropiedad`, `useContratosByPropiedad` |
| `/contratos` | `Contratos.tsx` | Listado con filtros | `useContratos`, `usePersonas`, `usePropiedades` |
| `/contratos/:id` | `ContratoDetalle.tsx` | Tabs: Resumen / Historial / Liquidaciones | `useContrato`, `useLiquidaciones`, `useEventosContrato` |
| `/nuevo-contrato` | `NuevoContrato.tsx` | Wizard de alta | `usePropiedades`, `usePersonas` |
| `/liquidaciones` | `Liquidaciones.tsx` | Listado por período/estado | `useLiquidaciones`, `useContratos` |
| `/liquidaciones/:id` | `LiquidacionDetalle.tsx` | Detalle con conceptos, pagos, navegación período prev/next | `useLiquidacion`, `useConceptosLiquidacion`, `usePagosByLiquidacion` |
| `/generar-liquidacion` | `GenerarLiquidacion.tsx` | Form: contrato + período + conceptos | `useContratos`, `useLiquidaciones` |
| `/pagos` | `Pagos.tsx` | Listado global con filtros | `usePagos`, `useLiquidaciones`, `useContratos` |
| `/propietarios` | `Propietarios.tsx` | ABM con búsqueda y duplicados | `usePersonas('propietario')` + mutaciones |
| `/propietarios/:id` | `PropietarioDetalle.tsx` | Ficha + propiedades + liquidaciones | `usePersona`, `usePropiedades`, `useLiquidaciones` |
| `/inquilinos` | `Inquilinos.tsx` | ABM con búsqueda y duplicados | `usePersonas('inquilino')` + mutaciones |
| `/inquilinos/:id` | `InquilinoDetalle.tsx` | Ficha + contratos | `usePersona`, `useContratos` |
| `/reportes` | `Reportes.tsx` | Resultado financiero por período | `useLiquidaciones`, `usePagos` |
| `*` | `NotFound.tsx` | 404 | — |

## Componentes transversales
- `AppLayout` (sidebar fijo + topbar + outlet)
- `PersonaFormDialog` — alta/edición unificada con detección de duplicados
- `RegistrarPagoDialog` — modal para cargar un pago contra una liquidación
