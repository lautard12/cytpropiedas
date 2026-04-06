

# Plan: Documento técnico detallado para presupuestar con IA

Generar un documento Word (.docx) exhaustivo que describa todo lo construido en el sistema CyT Propiedades, sin horas ni costos, pensado para que una IA pueda analizar la complejidad y recomendar un presupuesto.

## Contenido del documento

**1. Resumen ejecutivo** — Qué es el sistema, para quién, qué problema resuelve (reemplazo de Excel), contexto Argentina/inmobiliaria.

**2. Stack tecnológico** — React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Supabase (PostgreSQL + API REST), React Query, Recharts, date-fns. Hosting en Lovable Cloud.

**3. Modelo de datos completo** — Las 7 tablas con todos sus campos, tipos, relaciones (FK), enums, y lógica de negocio implícita:
- `propietarios` (9 campos)
- `inquilinos` (8 campos)
- `propiedades` (11 campos, 3 enums)
- `contratos` (20 campos, reglas por contrato)
- `liquidaciones` (15 campos, ciclo de estados)
- `conceptos_liquidacion` (6 campos)
- `pagos` (10 campos, 2 enums)
- `eventos_contrato` (11 campos, 4 categorías, 16 tipos)

**4. Pantallas implementadas** — 15 rutas, descripción funcional de cada una:
- Dashboard (KPIs financieros, gráficos, trazabilidad)
- Propiedades (listado + detalle con tabs)
- Contratos (listado + detalle con tabs Resumen/Historial)
- Liquidaciones (listado + detalle con navegación prev/next)
- Pagos (listado con filtros)
- Propietarios (listado + detalle)
- Inquilinos (listado + detalle)
- Reportes (resultado financiero)
- Generar Liquidación (formulario completo)
- Nuevo Contrato (formulario)

**5. Funcionalidades implementadas** — Detalle técnico de cada feature:
- CRUD completo contra base de datos real
- Registro de pagos con actualización automática de estado (Pendiente → Parcial → Cobrada)
- Generación de liquidaciones con cálculo de comisión, IVA, neto propietario
- Sistema de historial con eventos contractuales, financieros, administrativos, documentales
- Timeline vertical de eventos
- Navegación entre períodos de liquidación
- Dashboard con 6 KPIs + gráfico de barras + torta + tabla de trazabilidad
- Filtros y badges de estado con colores semánticos
- Layout responsive con sidebar

**6. Lógica de negocio** — Reglas específicas del rubro:
- Liquidación = Contrato + Período (no propiedad)
- Cada contrato tiene reglas propias (TGI, API, expensas, seguro, servicios)
- Comisión inmobiliaria configurable por contrato
- Ajuste por ICL/IPC con frecuencia configurable
- Ciclo de vida: Borrador → Pendiente → Parcial → Cobrada → Transferida
- Cálculo: neto_propietario = total_cobrado - comision_inmobiliaria

**7. Componentes reutilizables** — ~30 componentes shadcn/ui, 1 componente custom (RegistrarPagoDialog), hooks de datos (15 hooks), helpers (formatCurrency, formatDate, findById).

**8. Métricas del código** — ~3,120 líneas en páginas + componentes + hooks. 15 rutas. 7 tablas. 5 enums. Sin autenticación (MVP demo).

**9. Qué falta para producción** — Listado explícito:
- Autenticación y autorización (RLS real)
- Edición/eliminación de registros
- Exportación PDF de liquidaciones
- Notificaciones y alertas
- Multi-tenancy
- Tests automatizados
- Auditoría y logging
- Backup y recuperación

## Implementación

Un único script Node.js genera el .docx con docx-js, usando tablas para el modelo de datos, secciones numeradas, y formato profesional. Se valida y se entrega como artifact.

## Archivo generado

`/mnt/documents/CyT_Propiedades_Especificacion_Tecnica.docx`

