# Flujo 05 — Ajuste de alquiler ICL / IPC (roadmap)

## Modelo de datos sugerido (no implementado aún)

```sql
CREATE TABLE public.indices_ajuste (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indice      text NOT NULL,           -- 'ICL' | 'IPC'
  periodo     text NOT NULL,           -- 'YYYY-MM'
  valor       numeric(14,6) NOT NULL,  -- coeficiente publicado
  UNIQUE(indice, periodo)
);
```

## Lógica

1. Job mensual (edge function programada) consulta API del BCRA / INDEC y guarda
   nuevo valor en `indices_ajuste`.
2. Para cada contrato `Activo` con ajuste pendiente según `frecuencia_ajuste`:
   - Calcula `coeficiente = valor[periodo_actual] / valor[periodo_anterior_aplicado]`.
   - Calcula `nuevo_alquiler = alquiler_actual * coeficiente`.
3. Genera evento `tipo='ajuste_icl'` (o `ajuste_ipc`) en `eventos_contrato`
   con `monto = nuevo_alquiler − alquiler_anterior`.
4. Actualiza `contratos.alquiler_base` o registra el alquiler vigente en una
   tabla histórica `alquileres_vigentes` (recomendado para no perder trazabilidad).
5. La próxima `Generar liquidación` toma el nuevo monto.

## UI

- Pantalla de "Próximos ajustes": lista contratos con ajuste pendiente en ≤ 30 días.
- Botón "Aplicar ajuste" con preview antes de confirmar.
