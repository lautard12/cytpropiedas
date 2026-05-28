
## Problema

El combobox + selector de período en `/generar-liquidacion` obliga a "adivinar" el contrato antes de ver nada. Con 20+ contratos ya cuesta; con 100+ es inviable. No muestra qué contratos ya están liquidados del mes ni cuáles faltan.

## Solución propuesta

Reemplazar la pantalla actual por una **bandeja de liquidación mensual**: una tabla visual, paginada y filtrable que muestra **todos los contratos activos** y el **estado del período seleccionado**. El usuario elige el mes una sola vez arriba, y desde ahí ve de un vistazo qué falta liquidar.

### Layout

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Generar liquidaciones                                               │
│                                                                     │
│ Período: [ Noviembre 2025 ▾ ]   ← mes/año pickeable (default: actual)│
│                                                                     │
│ 🔍 [Buscar dirección / inquilino / código]   Estado: [Todos ▾]      │
│ Tipo: [Todos ▾]   Propietario: [Todos ▾]                            │
│                                                                     │
│ Resumen del período: 18 pendientes · 4 generadas · 1 en mora        │
│                                                                     │
│ ┌─ ☐  Contrato         Propiedad          Inquilino   Alquiler  Estado período   Acción ─┐
│ │  ☐  CT-2025-101 (V)  Bv. Oroño 1234 3°A F. Paz      $385.000  ● Pendiente      [Liquidar]│
│ │  ☐  CT-2025-102 (C)  Pellegrini 2580   C. Ríos     $1.250.000 ✓ Generada #142  [Ver]    │
│ │  ☐  CT-2024-008 (V)  Salta 1450 5°B    N. Acuña     $420.000  ⚠ En mora        [Liquidar]│
│ │  ...                                                                                     │
│ └────────────────────────────────────────────────────────────────────────────────────────┘
│                                                                     │
│ [☑ Seleccionar todos pendientes]   [Generar 18 liquidaciones ▾]    │
│                                                                     │
│           « 1  2  3  4  5  »      Mostrando 20 de 87                │
└─────────────────────────────────────────────────────────────────────┘
```

### Comportamiento

- **Período arriba, una vez**. Cambiar el mes recalcula el estado de toda la tabla.
- **Cada fila = un contrato activo** con su estado para ese período:
  - `Pendiente` (sin liquidación generada)
  - `Generada` (link al detalle de la liquidación)
  - `Cobrada` / `Parcial` / `En mora`
- **Acción primaria por fila**:
  - Si está pendiente → botón **Liquidar** abre un modal/drawer con el formulario actual de "Generar liquidación" ya prellenado (contrato + período). Confirma y vuelve a la lista actualizada.
  - Si ya está generada → botón **Ver** lleva al detalle.
- **Búsqueda y filtros**: texto libre (dirección, inquilino, código, propietario), filtro por estado del período, tipo de contrato y propietario.
- **Acción masiva**: checkbox por fila + "Generar liquidaciones seleccionadas" para procesar todos los pendientes del mes en un click (modal de confirmación con totales estimados).
- **Paginación** server-side de 20 por página + contador.
- **Estado vacío** amigable cuando todos están liquidados ("✓ Todos los contratos del mes están liquidados").

### Ruta y navegación

- La ruta actual `/generar-liquidacion` pasa a renderizar esta nueva bandeja.
- El formulario detallado que hoy ocupa la pantalla se convierte en un **drawer/dialog reutilizable** (`<GenerarLiquidacionDialog contratoId periodo />`) que se abre desde la bandeja o desde el detalle del contrato.
- Botón "Nueva liquidación" en `/liquidaciones` lleva acá.

### Por qué esta solución

- **Cero búsqueda a ciegas**: el usuario ve qué falta, no tiene que recordarlo.
- **Visión operativa mensual**: la tabla refleja el "trabajo del mes" — es el flujo real de una administración.
- **Escala a cientos de contratos** vía paginación + filtros, sin perder el combobox como acceso directo (queda dentro del dialog).
- **Bulk action** ataca el caso real: a fin de mes querés liquidar todo lo activo de una.

## Detalles técnicos

- Nueva página `src/pages/GenerarLiquidaciones.tsx` (plural) reemplaza la actual en la ruta `/generar-liquidacion`.
- Mover el formulario actual a `src/components/GenerarLiquidacionDialog.tsx` (drawer en mobile, dialog en desktop).
- Hook nuevo `useContratosConEstadoPeriodo(periodo)` que cruza `contratos` activos con `liquidaciones` del período y devuelve estado calculado.
- Paginación client-side por ahora (con 87 contratos basta); listo para mover a server-side cuando crezca.
- Reusar `ContratoCombobox` dentro del dialog para casos de "liquidar otro contrato" desde el detalle.
- Filtros con estado en URL (`?periodo=2025-11&estado=pendiente`) para compartir/recargar.

Si te cierra, lo armo así. Si querés cambiar algo (ej: que el período sea por fila en vez de global, o sacar la acción masiva), avisame antes de implementar.
