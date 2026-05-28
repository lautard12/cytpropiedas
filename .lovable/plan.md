# Recordatorio de ajuste de alquiler

## Qué resuelve

Hoy la admin tiene que recordar de memoria cuándo cada contrato ajusta su alquiler. Con muchos contratos es inviable. Queremos que el sistema:

1. **Detecte automáticamente** qué contratos tienen ajuste según `fecha_inicio` + `frecuencia_ajuste`.
2. **Avise un mes antes** (preaviso al propietario) y **el mes del ajuste** (aplicar nuevo valor).
3. **Registre** cuándo la admin ya notificó al propietario, para no insistir.

## Lógica de cálculo

`frecuencia_ajuste` es texto: Mensual / Bimestral / Trimestral / Cuatrimestral / Semestral / Anual.

```text
mesesCiclo = { Mensual:1, Bimestral:2, Trimestral:3, Cuatrimestral:4, Semestral:6, Anual:12 }
base = contrato.fecha_ajuste_override ?? contrato.fecha_inicio
mesesDesdeBase(periodo) = (año_periodo - año_base)*12 + (mes_periodo - mes_base)
esMesDeAjuste(periodo)  = mesesDesdeBase > 0 && mesesDesdeBase % mesesCiclo === 0
esPreaviso(periodo)     = esMesDeAjuste(periodo + 1 mes)
```

Si `frecuencia_ajuste = 'Mensual'` o vacía/sin sentido → no se muestran badges.

Se calcula en cliente (helper puro), reutilizable desde Bandeja y formulario.

## Cambios

### 1. Schema (migración)

- `contratos.fecha_ajuste_override date NULL` — fecha base alternativa para el ciclo de ajustes (si está en NULL, se usa `fecha_inicio`).
- Reusar `eventos_contrato` para el log del preaviso: `tipo='preaviso_ajuste'`, `periodo=YYYY-MM del ajuste`, `descripcion='Propietario notificado del ajuste de <periodo>'`. Sin tabla nueva.

### 2. Helper `src/lib/ajustes.ts`

Funciones puras:

- `mesesEntrePeriodos(base: Date, periodoYYYYMM: string): number`
- `getEstadoAjuste(contrato, periodoYYYYMM): { tipo: 'aplicar' | 'preavisar' | 'ninguno'; periodoAjuste: string; periodoAjusteLabel: string }`
- `addMeses(periodoYYYYMM, n): string`

### 3. Bandeja `src/pages/BandejaLiquidaciones.tsx`

- Cruzar cada fila con `getEstadoAjuste(contrato, periodo)` y con eventos `preaviso_ajuste` ya registrados para ese ajuste.
- Nuevo **badge en la fila** (al lado del estado del período):
  - `⚠ Aplicar aumento` (rojo/warning) cuando `tipo='aplicar'`.
  - `🔔 Avisar aumento de <mes>` (azul/info) cuando `tipo='preavisar'` y no hay evento de preaviso registrado.
  - `✓ Aviso enviado` (verde sutil) cuando `tipo='preavisar'` y ya existe el evento.
- Tooltip en cada badge con el detalle (frecuencia, fecha base usada, mes objetivo).
- Cargar `eventos_contrato` filtrando `tipo='preaviso_ajuste'` (nuevo hook `usePreavisosAjuste()` o reusar `useEventosContrato` si existe).
- Sin cambios en filtros, bulk, paginación.

### 4. Formulario `src/pages/GenerarLiquidacion.tsx`

Cuando se selecciona contrato + período y `getEstadoAjuste` devuelve algo:

- **Caso `aplicar`**: callout warning arriba del form → "Este contrato ajusta este período (frecuencia X). Cargá el nuevo alquiler base antes de generar." Botón secundario "Editar alquiler base del contrato" (abre input inline que `PATCH contratos.alquiler_base`). El campo "Alquiler" en conceptos se prellena con el nuevo valor.
- **Caso `preavisar`**: callout info → "El próximo período tiene ajuste. Acordate de avisarle al propietario." Con **checkbox "Propietario notificado del aumento de <mes>"** que al tildarse hace `INSERT eventos_contrato (tipo='preaviso_ajuste', contrato_id, periodo=<periodo_ajuste>, descripcion)`. Una vez tildado queda como "✓ Aviso registrado el dd/mm".
- El checkbox también disponible directamente desde la fila de Bandeja vía un pequeño popover en el badge `🔔 Avisar`, para no obligar a entrar al form.

### 5. Configuración por contrato

En `ContratoDetalle.tsx`, sección "Configuración contractual vigente": agregar campo editable **"Fecha base de ajustes"** (default = `fecha_inicio`, override = `fecha_ajuste_override`). Tooltip explica que cambia el ciclo de ajustes sin tocar el inicio del contrato.

## Detalle técnico

- Sin cambios en cálculo de liquidación: el aumento se refleja simplemente porque la admin sube el `alquiler_base` del contrato (o edita el concepto Alquiler) antes de generar.
- Sin cambios al modelo de liquidaciones; todo es UI + 1 columna nueva + eventos.
- Hook `useEventosContrato` ya existe (o se agrega query liviana filtrando por tipo).
- Helpers cubiertos con tests unitarios en `src/test/ajustes.test.ts` (casos: trimestral desde marzo → jun/sep/dic/mar; semestral; preaviso fin de año dic→ene; override).

## Fuera de alcance (fase 2)

- Cálculo automático de coeficiente ICL/IPC: requiere tabla `indices_ajuste` y job. Hoy queda manual.
- Notificación por email/whatsapp al propietario: se registra solo el evento.

## Diagrama del flujo

```text
Bandeja (mayo 2026)
├─ CT-101  Trim. (inicio mar/25)   [Pendiente] [🔔 Avisar aumento de Jun] ← popover: ☐ Notificado
├─ CT-102  Sem.  (inicio jun/25)   [Pendiente]                              ← sin badge
└─ CT-103  Trim. (inicio mar/25)   [Pendiente] [⚠ Aplicar aumento]          ← form muestra callout rojo
```

Si te cierra, lo implemento así.
