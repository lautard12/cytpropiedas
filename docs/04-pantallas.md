# 4. Pantallas

| Ruta | Archivo | Propósito | Datos consumidos |
|---|---|---|---|
| `/auth` | `Auth.tsx` | Login email + password (signup deshabilitado) | `AuthContext` |
| `/` | `Dashboard.tsx` | KPIs, evolución mensual, eventos recientes | `useLiquidaciones`, `usePagos`, `useContratos`, `useEventosRecientes` |
| `/propiedades` | `Propiedades.tsx` | Listado con filtros por estado/tipo | `usePropiedades`, `usePersonas` |
| `/propiedades/:id` | `PropiedadDetalle.tsx` | Ficha + contratos históricos + tab "Configuración Contractual Vigente" | `usePropiedad`, `useContratosByPropiedad` |
| `/contratos` | `Contratos.tsx` | Listado con filtros | `useContratos`, `usePersonas`, `usePropiedades` |
| `/contratos/:id` | `ContratoDetalle.tsx` | Tabs: Resumen / Historial / Liquidaciones | `useContrato`, `useLiquidaciones`, `useEventosContrato` |
| `/nuevo-contrato` | `NuevoContrato.tsx` | Wizard de alta | `usePropiedades`, `usePersonas` |
| `/liquidaciones` | `Liquidaciones.tsx` | Listado por período/estado | `useLiquidaciones`, `useContratos` |
| `/liquidaciones/:id` | `LiquidacionDetalle.tsx` | Detalle con conceptos, pagos y anulación | `useLiquidacion`, `useConceptosLiquidacion`, `usePagosByLiquidacion` |
| `/generar-liquidacion` | `GenerarLiquidacion.tsx` | Form: contrato + período + conceptos | `useContratos`, `useLiquidaciones` |
| `/pagos` | `Pagos.tsx` | Listado global con filtros | `usePagos`, `useLiquidaciones`, `useContratos` |
| `/rendiciones` | `Rendiciones.tsx` | Cálculo neto a propietario y registro de transferencias | `useLiquidaciones`, `usePagos`, `usePropietarios` |
| `/personas` | `Personas.tsx` | **Módulo unificado** con tabs Todas / Propietarios / Inquilinos / Garantes, búsqueda global y ABM con detección de duplicados | `usePropietarios`, `useInquilinos` + mutaciones |
| `/personas/:id` | `PersonaDetalle.tsx` | Ficha 360° con secciones dinámicas según roles (propietario/inquilino/garante) | `usePersona`, `usePropiedades`, `useContratos`, `useLiquidaciones` |
| `/propietarios`, `/propietarios/:id`, `/inquilinos`, `/inquilinos/:id` | — | **Rutas legacy** redirigidas a `/personas?tab=…` y `/personas/:id?rol=…` (compatibilidad) | — |
| `/reportes` | `Reportes.tsx` | Resultado financiero por período | `useLiquidaciones`, `usePagos` |
| `/mi-organizacion` | `MiOrganizacion.tsx` | Tabs Datos / Sucursales / Personal (alta y baja) — **solo admin** | `useOrganizacion`, `useSucursales`, `usePersonalUsuarios` |
| `/auditoria` | `Auditoria.tsx` | Bitácora inmutable filtrable — **solo admin** | `useAuditoria` |
| `*` | `NotFound.tsx` | 404 | — |

## Componentes transversales
- `AppLayout` — sidebar fijo + topbar + outlet.
- `ProtectedRoute` — protege rutas; soporta `requireAdmin`.
- `PersonaFormDialog` — alta/edición unificada con detección de duplicados (DNI/CUIT/email).
- `PropiedadFormDialog` — ABM completo con lat/long y matrícula catastral.
- `SucursalFormDialog` — ABM de sucursales por organización.
- `PersonalFormDialog` — alta integrada (auth user + persona + rol + legajo) vía edge function `create-personal`.
- `PersonalBajaDialog` — cierra el legajo en `personal` (fecha + causa) y desactiva el usuario.
- `RegistrarPagoDialog` — modal para cargar un pago; filtra medios de pago según los pactados en el contrato (`medios_pago_aceptados`).
- `AnularPagoDialog` — pide motivo (mín. 4 chars) e invoca la RPC `anular_pago`.
- `ConsultarMoraDialog` — flujo de consulta al propietario para aplicar punitorio cuando la liquidación supera la fecha de vencimiento; persiste en `consultas_mora` y, si se aprueba, agrega un concepto "Punitorio" calculado con `tasa_mora_diaria` (interés compuesto diario).
- `RendirPropietarioDialog` — registra la transferencia neta al propietario con comprobante adjunto.
- `GarantiasSection` / `RenovacionSection` / `RescindirDialog` — gestión de garantías, renovación de contratos y rescisión anticipada.
