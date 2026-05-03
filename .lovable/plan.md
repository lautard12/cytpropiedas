# Plan: Renovaciones, Rescisiones con Multa, Garantías y Notificaciones por Email

Implementación en una sola iteración, ordenada de menor a mayor riesgo: primero las **garantías** (independiente), luego **rescisiones con multa**, luego **renovaciones**, y finalmente las **notificaciones por email** que se apoyan en todo lo anterior.

---

## Fase 1 — Garantías múltiples y vencimientos

### Base de datos
- Enum `tipo_garantia`: `Propietaria | Garante | Seguro_Caucion | Recibo_Sueldo | Otro`
- Enum `estado_garantia`: `Vigente | Vencida | Reemplazada | Anulada`
- Tabla **`garantias_contrato`**: `id, contrato_id, tipo, descripcion, persona_id (opc.), monto_cobertura (opc.), aseguradora (opc.), numero_poliza (opc.), fecha_emision, fecha_vencimiento (opc.), documento_url (opc.), estado, observaciones, created_at`
- Bucket Storage privado **`garantias`** + RLS (solo autenticados)
- Función `marcar_garantias_vencidas()` ejecutada por cron diario

### UI
- Nueva sección **"Garantías"** en `ContratoDetalle.tsx`
- `GarantiaFormDialog` con campos dinámicos según tipo (caución → aseguradora + póliza; garante → selector de persona; recibos → monto/empleador)
- Acciones: agregar, reemplazar, anular, ver/descargar documento
- Badges de estado y "vence en X días" en lista de contratos y dashboard
- Paso opcional al final del wizard `NuevoContrato.tsx` para cargar garantías iniciales

---

## Fase 2 — Rescisión anticipada con multa

### Base de datos
- En **`contratos`**: agregar `permite_rescision_anticipada boolean default true`, `multa_rescision_porcentaje numeric default 0`, `multa_rescision_observaciones text`
- Tabla **`rescisiones`**: `id, contrato_id, fecha_efectiva, motivo, meses_restantes, valor_restante, multa_porcentaje, multa_monto, liquidacion_multa_id, created_at`
- Función `rescindir_contrato(_contrato_id, _fecha_efectiva, _motivo)` que en una transacción:
  1. Calcula meses restantes y multa
  2. Actualiza contrato (`estado=Rescindido`, `fecha_fin`)
  3. Crea liquidación con concepto "Multa por rescisión anticipada" (si multa > 0)
  4. Inserta evento `rescision` en `eventos_contrato`
  5. Trigger libera la propiedad

### UI
- En `NuevoContrato.tsx` paso "Reglas": campos para `multa_rescision_porcentaje` (default **0**, la operadora lo define caso por caso) y observaciones
- En `ContratoDetalle.tsx` botón **"Rescindir"** → wizard:
  - Fecha efectiva + motivo
  - Cálculo automático visible: `meses_restantes × alquiler_base × %`
  - Confirmación con preview de la liquidación de multa que se va a crear

---

## Fase 3 — Renovaciones con preaviso de 3 meses

### Base de datos
- Enum `respuesta_renovacion`: `Pendiente | Acepta | Rechaza`
- Enum `resultado_renovacion`: `Pendiente | Renovado | No_Renovado`
- Tabla **`renovaciones_contrato`**: `id, contrato_id, fecha_consulta, respuesta_propietario, respuesta_inquilino, fecha_respuesta_propietario, fecha_respuesta_inquilino, resultado, contrato_nuevo_id, observaciones, created_at`
- Vista/función para detectar contratos con `fecha_fin` a ≤90 días sin proceso de renovación abierto

### UI
- En `ContratoDetalle.tsx` nueva sección **"Renovación"** (visible cuando faltan ≤90 días o ya existe registro):
  - Botón "Iniciar consulta de renovación"
  - Estado de respuestas con badges
  - Acción "Registrar renovación" → redirige a `NuevoContrato` precargado
  - Acción "No renovar — coordinar entrega de llaves"
- Widget **"Contratos próximos a vencer"** en `Dashboard.tsx` con CTA

---

## Fase 4 — Notificaciones por email

Usando la infraestructura de email de Lovable (sin servicios externos).

### Setup
- Configurar dominio de email del proyecto (diálogo de setup)
- Provisionar infraestructura de cola de emails
- Scaffold de transactional emails

### Plantillas a crear
1. **`renovacion-consulta-propietario`** — al iniciar consulta de renovación
2. **`renovacion-consulta-inquilino`** — al iniciar consulta de renovación
3. **`renovacion-recordatorio`** — recordatorio si no respondió en X días
4. **`garantia-por-vencer`** — 30/15/7 días antes del vencimiento (al operador y opcionalmente al inquilino)
5. **`rescision-confirmada`** — al propietario e inquilino con detalle de multa
6. **`contrato-por-vencer`** — al operador, 90 días antes (dispara flujo de renovación)

### Disparadores
- **Manual** (botones en UI): consultas de renovación, confirmación de rescisión
- **Automático** (cron diario): garantías por vencer, contratos por vencer
  - Edge Function `notificaciones-diarias` programada con pg_cron
  - Idempotencia con `idempotency_key` por evento + plantilla + fecha

### Configuración por organización
- Tabla **`config_notificaciones`** (1 fila por organización): toggles para activar/desactivar cada tipo de email + emails de copia (CC al operador)

---

## Fase 5 — Documentación

Actualizar:
- `docs/03-modelo-de-datos.md` — nuevas tablas y enums
- `docs/db/schema.sql`, `docs/db/triggers.sql`
- `docs/flujos/06-cierre-contrato.md` — rescisión con multa
- Nuevo `docs/flujos/08-renovacion-contrato.md`
- Nuevo `docs/flujos/09-garantias.md`
- Nuevo `docs/flujos/10-notificaciones-email.md`
- `docs/diagramas/estados-contrato.mmd`

---

## Notas de implementación

- Multa default: **0%** (la operadora la carga por contrato, según lo pactado)
- Las garantías se pueden agregar/reemplazar en cualquier momento del contrato (no solo al alta)
- El cron de notificaciones evita duplicados con `idempotency_key` derivado de `entidad_id + tipo + fecha`
- Configuración de dominio de email: te voy a pedir que la completes en un diálogo cuando arranquemos la Fase 4
