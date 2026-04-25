# Endpoints — Contratos

Pantallas: `/contratos`, `/contratos/:id`, `/nuevo-contrato`.

---

## 1. Listar contratos

**Hook**
```ts
useContratos(): UseQueryResult<Contrato[]>
```

**HTTP**
```
GET /rest/v1/contratos?select=*&order=codigo.asc
```

---

## 2. Detalle de contrato

**Hook**
```ts
useContrato(id: string): UseQueryResult<Contrato | null>
```

**HTTP**
```
GET /rest/v1/contratos?id=eq.{id}&select=*
```

Pantalla detalle también consume:
- `useEventosContrato(id)` — timeline (ver [`eventos.md`](./eventos.md))
- `useLiquidaciones()` filtrado por `contrato_id` en cliente.

---

## 3. Crear contrato (Nuevo Contrato)

**HTTP**
```
POST /rest/v1/contratos
Headers: Prefer: return=representation
Body:
{
  "codigo": "CTR-2025-008",
  "propiedad_id": "uuid",
  "propietario_id": "uuid",
  "inquilino_id": "uuid",
  "fecha_inicio": "2025-04-01",
  "fecha_fin":    "2027-03-31",
  "estado": "Activo",
  "alquiler_base": 350000,
  "tipo_ajuste": "ICL",
  "frecuencia_ajuste": "Cuatrimestral",
  "dia_vencimiento": 10,
  "comision_porcentaje": 8.5,
  "iva": false,
  "tgi": "Inquilino",
  "api": "Inquilino",
  "expensas_ordinarias": "Inquilino",
  "expensas_extraordinarias": "Propietario",
  "seguro": "No aplica",
  "servicios": "Inquilino",
  "reglas_observaciones": ""
}
```

**Validaciones (frontend con zod)**
- `fecha_fin > fecha_inicio`.
- `propiedad_id` no debe tener otro contrato `Activo` superpuesto.
- `propietario_id` debe coincidir con `propiedades.propietario_id`.
- `inquilino_id` debe tener rol `inquilino`.

**Side-effects backend**
- Trigger `sync_propiedad_estado` actualiza la propiedad a `Alquilada` y setea
  `contrato_activo_id`.

---

## 4. Editar contrato

```
PATCH /rest/v1/contratos?id=eq.{id}   Body: { ...campos }
```

Cambiar `estado` dispara el trigger de sincronización con `propiedades`.

---

## 5. Rescindir / vencer

```
PATCH /rest/v1/contratos?id=eq.{id}
Body: { "estado": "Rescindido", "fecha_fin": "2025-04-30" }
```

Adicionalmente registrar evento (ver [`eventos.md`](./eventos.md)):
```
POST /rest/v1/eventos_contrato
Body: { contrato_id, fecha, tipo: "rescision", categoria: "contractual",
        descripcion: "..." }
```
