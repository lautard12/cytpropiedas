# Endpoints — Dashboard y Reportes

Pantallas: `/` (Dashboard), `/reportes`.

No hay endpoints dedicados: ambas pantallas componen su información
**agregando en cliente** datos de las tablas existentes. Se documentan aquí los
hooks usados y las consultas resultantes, más una propuesta de RPC futura.

---

## Dashboard (`/`)

### Datos consumidos
| Hook | HTTP equivalente |
|---|---|
| `useLiquidaciones()` | `GET /rest/v1/liquidaciones?select=*&order=periodo.desc` |
| `usePagos()` | `GET /rest/v1/pagos?select=*&order=fecha.desc` |
| `useContratos()` | `GET /rest/v1/contratos?select=*` |
| `usePropiedades()` | `GET /rest/v1/propiedades?select=*` |
| `useEventosRecientes(10)` | `GET /rest/v1/eventos_contrato?order=fecha.desc&limit=10` |

### KPIs (calculados en cliente)
- **Cobrado del mes** = Σ `pagos.monto` confirmados con `fecha` en mes actual.
- **A cobrar** = Σ `liquidaciones.pendiente` con `estado IN ('Pendiente','Parcial')`.
- **Comisión generada** = Σ `liquidaciones.comision_inmobiliaria` del mes.
- **Contratos activos** = `contratos` con `estado = 'Activo'`.
- **Propiedades vacantes** = `propiedades` con `estado = 'Vacante'`.
- **Tasa de cobranza** = `cobrado / total_cobrar` del mes.

### Gráficos
- **Barras**: evolución 6 meses (cobrado / pendiente / comisión).
- **Torta**: distribución por estado de liquidación.

---

## Reportes (`/reportes`) — Resultado financiero

### Datos consumidos
- `useLiquidaciones()` filtradas por `periodo` en cliente.
- `usePagos()` para conciliar.

### Métricas
- **Facturado del período** = Σ `liquidaciones.total_cobrar`.
- **Cobrado del período** = Σ `pagos.monto` confirmados con fecha en el período.
- **Pendiente acumulado** = Σ `pendiente` al cierre del período.
- **Comisión devengada** = Σ `comision_inmobiliaria`.
- **Neto al propietario** = Σ `neto_propietario` con `estado IN ('Cobrada','Transferida')`.

---

## Propuesta de RPC futura (optimización)

Cuando crezca el volumen, mover los cálculos a funciones SQL para reducir payloads:

```sql
CREATE OR REPLACE FUNCTION public.dashboard_kpis(p_mes text)  -- 'YYYY-MM'
RETURNS TABLE (
  cobrado_mes numeric,
  por_cobrar  numeric,
  comision    numeric,
  contratos_activos int,
  propiedades_vacantes int,
  tasa_cobranza numeric
) LANGUAGE sql STABLE AS $$
  SELECT
    (SELECT COALESCE(SUM(monto),0) FROM pagos
       WHERE estado='Confirmado' AND to_char(fecha,'YYYY-MM') = p_mes),
    (SELECT COALESCE(SUM(pendiente),0) FROM liquidaciones
       WHERE estado IN ('Pendiente','Parcial')),
    (SELECT COALESCE(SUM(comision_inmobiliaria),0) FROM liquidaciones
       WHERE periodo = p_mes),
    (SELECT count(*) FROM contratos WHERE estado='Activo'),
    (SELECT count(*) FROM propiedades WHERE estado='Vacante'),
    NULL::numeric;
$$;
```

Llamada desde el cliente:
```
POST /rest/v1/rpc/dashboard_kpis
Body: { "p_mes": "2025-04" }
```
