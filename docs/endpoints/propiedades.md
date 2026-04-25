# Endpoints — Propiedades

Pantallas: `/propiedades`, `/propiedades/:id`.

---

## 1. Listar propiedades

**Hook**
```ts
usePropiedades(): UseQueryResult<Propiedad[]>
```

**HTTP**
```
GET /rest/v1/propiedades?select=*&order=direccion.asc
```

---

## 2. Detalle de propiedad

**Hook**
```ts
usePropiedad(id: string): UseQueryResult<Propiedad | null>
```

**HTTP**
```
GET /rest/v1/propiedades?id=eq.{id}&select=*
```

---

## 3. Contratos asociados a una propiedad

**Hook**
```ts
useContratosByPropiedad(propiedadId: string): UseQueryResult<Contrato[]>
```

**HTTP**
```
GET /rest/v1/contratos?propiedad_id=eq.{propiedadId}&order=fecha_inicio.desc
```

---

## 4. Crear / editar / eliminar (roadmap UI)

```
POST   /rest/v1/propiedades       Body: { direccion, unidad, tipo, propietario_id, metros, ambientes, observaciones }
PATCH  /rest/v1/propiedades?id=eq.{id}   Body: { ...campos }
DELETE /rest/v1/propiedades?id=eq.{id}   // Validar: sin contratos activos
```

**Estado y `contrato_activo_id`** se mantienen automáticamente vía trigger
`sync_propiedad_estado` cuando un contrato pasa a `Activo`/`Vencido`/`Rescindido`.
