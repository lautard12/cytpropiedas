# Endpoints — Personas, Propietarios, Inquilinos

A partir de la separación en tablas específicas, las pantallas de **Propietarios** e **Inquilinos** consumen sus propias tablas (con join a `personas` para los datos básicos), y `personas` queda como maestro común.

Pantallas: `/propietarios`, `/propietarios/:id`, `/inquilinos`, `/inquilinos/:id`.
Hooks: `useSupabaseData.ts`, `usePersonaMutations.ts`.

---

## Modelo

```
personas (id, nombre, dni, cuit, email, telefono, direccion, observaciones, user_id, sucursal_id)
   │ 1
   ├──── propietarios (id, persona_id*UNIQUE, banco, cbu, alias_cbu, condicion_iva, observaciones_fiscales)
   └──── inquilinos   (id, persona_id*UNIQUE, garante_nombre, garante_telefono, garante_dni, ocupacion, ingresos_declarados, observaciones_inquilino)
```

`propiedades.propietario_id → propietarios.id`
`contratos.propietario_id → propietarios.id`
`contratos.inquilino_id → inquilinos.id`

`personas_roles` se sincroniza por trigger cuando se insertan/eliminan filas en `propietarios` o `inquilinos`.

---

## 1. Listar propietarios

**Hook**
```ts
usePropietarios(): UseQueryResult<Propietario[]>
```

**HTTP**
```
GET /rest/v1/propietarios?select=*,personas:persona_id(*,personas_roles(rol))
```

**Respuesta** `200 OK`
```jsonc
[{
  "id": "uuid (propietarios.id)",
  "persona_id": "uuid (personas.id)",
  "nombre": "Juan Pérez",
  "dni": "12.345.678",
  "cuit": "20-...",
  "email": "juan@x.com",
  "telefono": "+54...",
  "direccion": "...",
  "observaciones": "",
  "banco": "Galicia",
  "cbu": "00701...",
  "alias_cbu": "juan.perez",
  "condicion_iva": "Monotributo",
  "observaciones_fiscales": "",
  "roles": ["propietario"]
}]
```

## 2. Listar inquilinos

**Hook**: `useInquilinos()`

```
GET /rest/v1/inquilinos?select=*,personas:persona_id(*,personas_roles(rol))
```

Devuelve además: `garante_nombre`, `garante_telefono`, `garante_dni`, `ocupacion`, `ingresos_declarados`, `observaciones_inquilino`.

## 3. Detalle

```ts
usePropietario(id): UseQueryResult<Propietario | null>
useInquilino(id):   UseQueryResult<Inquilino | null>
```

`id` corresponde a `propietarios.id` / `inquilinos.id`.

## 4. Búsqueda de duplicado por identidad

```ts
findPersonaByIdentity({ dni, cuit, email }):
  Promise<{ id, nombre, roles, propietario_id?, inquilino_id? } | null>
```

```
GET /rest/v1/personas?or=(dni.eq.X,cuit.eq.Y,email.eq.z@x.com)
    &select=id,nombre,personas_roles(rol),propietarios(id),inquilinos(id)&limit=1
```

`id` aquí es **personas.id** (no del rol), porque la búsqueda detecta a la persona base.

## 5. Crear o editar propietario

**RPC atómico**
```ts
useUpsertPropietario().mutateAsync({ personaId: string|null, values: PropietarioValues })
// Devuelve propietarios.id
```

**HTTP**
```
POST /rest/v1/rpc/upsert_propietario
Body: {
  _persona_id: null | "uuid",
  _nombre, _dni, _cuit, _email, _telefono, _direccion, _observaciones,
  _banco, _cbu, _alias_cbu, _condicion_iva, _observaciones_fiscales
}
```

Si `_persona_id` es null, crea la persona; si no, actualiza esa persona y reutiliza/upsertea `propietarios`.

## 6. Crear o editar inquilino

```ts
useUpsertInquilino().mutateAsync({ personaId: string|null, values: InquilinoValues })
```

```
POST /rest/v1/rpc/upsert_inquilino
Body: {
  _persona_id, _nombre, _dni, _cuit, _email, _telefono, _direccion, _observaciones,
  _garante_nombre, _garante_telefono, _garante_dni,
  _ocupacion, _ingresos_declarados, _observaciones_inquilino
}
```

## 7. Eliminar propietario / inquilino

```ts
useDeletePropietario().mutateAsync({ propietarioId, personaId })
useDeleteInquilino().mutateAsync({ inquilinoId, personaId })
```

```
DELETE /rest/v1/propietarios?id=eq.{propietarioId}
DELETE /rest/v1/inquilinos?id=eq.{inquilinoId}
```

El trigger `sync_personas_roles` borra automáticamente la fila correspondiente en `personas_roles`. Si la persona no queda referenciada en ninguna otra tabla de rol, el front la elimina luego de `personas`.

**Validación previa (frontend)**:
- Propietarios: bloquear si hay `propiedades.propietario_id = id` o `contratos.propietario_id = id`.
- Inquilinos: bloquear si hay `contratos.inquilino_id = id` activos.
