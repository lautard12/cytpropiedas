# Endpoints — Personas (módulo unificado)

Desde la unificación, **propietarios e inquilinos viven en un único módulo** `/personas` con tabs (Todas / Propietarios / Inquilinos / Garantes). Las rutas legacy `/propietarios*` e `/inquilinos*` siguen existiendo pero **redirigen** a `/personas` con el query param correspondiente (`?tab=…` o `?rol=…`). A nivel de datos, las tablas específicas (`propietarios`, `inquilinos`) siguen separadas en 1-a-1 con `personas`, y los **roles de dominio se derivan** de la presencia de filas en esas tablas.

Pantallas: `/personas`, `/personas/:id` (ficha 360° con secciones dinámicas según roles).
Hooks: `useSupabaseData.ts`, `usePersonaMutations.ts`.

---

## Modelo

```
personas (id, nombre, dni, cuit, email, telefono, direccion, observaciones, sucursal_id)
   │ 1
   ├──── propietarios (id, persona_id*UNIQUE, banco, cbu, alias_cbu, condicion_iva, observaciones_fiscales)
   ├──── inquilinos   (id, persona_id*UNIQUE, garante_nombre, garante_telefono, garante_dni, ocupacion, ingresos_declarados, observaciones_inquilino)
   └──── personal     (id, persona_id, sucursal_id, fecha_alta, causa_alta, fecha_baja, causa_baja, activo)
```

`propiedades.propietario_id → propietarios.id`
`contratos.propietario_id → propietarios.id`
`contratos.inquilino_id → inquilinos.id`

> **No existe `personas_roles`**. Los **roles de dominio** (propietario / inquilino) son **derivados**: una persona es propietaria ⇔ existe fila en `propietarios` con su `persona_id`; es inquilina ⇔ existe fila en `inquilinos`. Los hooks de lectura calculan `roles: ('propietario' | 'inquilino')[]` en cada respuesta.

> El vínculo persona ↔ usuario vive en `usuarios.persona_id` (1:1 opcional).

---

## 1. Listar propietarios

**Hook**
```ts
usePropietarios(): UseQueryResult<Propietario[]>
```

**HTTP**
```
GET /rest/v1/propietarios?select=*,personas:persona_id(*,inquilinos(id))
```

> El embed `inquilinos(id)` permite calcular `roles` en el front (si trae fila ⇒ también es inquilino).

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
  "roles": ["propietario"]            // derivado en el front
}]
```

## 2. Listar inquilinos

**Hook**: `useInquilinos()`

```
GET /rest/v1/inquilinos?select=*,personas:persona_id(*,propietarios(id))
```

Devuelve además: `garante_nombre`, `garante_telefono`, `garante_dni`, `ocupacion`, `ingresos_declarados`, `observaciones_inquilino`.

## 3. Detalle

```ts
usePropietario(id): UseQueryResult<Propietario | null>
useInquilino(id):   UseQueryResult<Inquilino | null>
usePersona(id):     UseQueryResult<Persona | null>   // genérico, por personas.id
```

`id` corresponde a `propietarios.id` / `inquilinos.id` (en los dos primeros) o a `personas.id` (en el tercero). En todos los casos se devuelve `roles` derivado.

## 4. Búsqueda de duplicado por identidad

```ts
findPersonaByIdentity({ dni, cuit, email }):
  Promise<{ id, nombre, roles, propietario_id?, inquilino_id? } | null>
```

```
GET /rest/v1/personas?or=(dni.eq.X,cuit.eq.Y,email.eq.z@x.com)
    &select=id,nombre,propietarios(id),inquilinos(id)&limit=1
```

`id` aquí es **`personas.id`** (no del rol), porque la búsqueda detecta a la persona base. Los roles se calculan en el front a partir de la presencia de `propietarios` / `inquilinos` en el embed.

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

Como ya no existe `personas_roles`, **no hace falta sincronizar nada**: borrar la fila de `propietarios` o `inquilinos` automáticamente "quita" ese rol derivado. Si la persona no queda referenciada en ninguna otra tabla de rol, el front la elimina luego de `personas`.

**Validación previa (frontend)**:
- Propietarios: bloquear si hay `propiedades.propietario_id = id` o `contratos.propietario_id = id`.
- Inquilinos: bloquear si hay `contratos.inquilino_id = id` activos.

---

## 8. Personal del staff (alta y baja)

**Hook**
```ts
usePersonalUsuarios(): UseQueryResult<PersonalUsuario[]>
// Cada item: persona base + user_id + email + roles (app) + legajo (sucursal/alta/baja)
```

**Implementación** (dos queries — `usuarios → personal` no tiene FK directa, va por `persona_id`):
```
GET /rest/v1/usuarios?select=id,email,nombre,activo,persona_id,personas:persona_id(*),user_roles(role)
    &persona_id=not.is.null
GET /rest/v1/personal?select=id,persona_id,sucursal_id,fecha_alta,causa_alta,fecha_baja,causa_baja,activo,sucursales:sucursal_id(id,nombre)
    &persona_id=in.(<ids>)
```

### Alta (admin)
```
POST /functions/v1/create-personal
Body: { nombre, email, password, telefono?, dni?, rol, sucursal_id? }
```
La edge function crea atómicamente: `auth.users` (con `email_confirm: true`) → fila en `personas` → vínculo `usuarios.persona_id` → `user_roles` → legajo activo en `personal` (`causa_alta = 'Alta Personal'`) → entrada de auditoría.

### Baja
Componente `PersonalBajaDialog`. Cierra el legajo y desactiva el usuario:
```
PATCH /rest/v1/personal?id=eq.{legajoId}
Body: { fecha_baja: 'YYYY-MM-DD', causa_baja: 'Renuncia — detalle' }

PATCH /rest/v1/usuarios?id=eq.{userId}
Body: { activo: false }
```
Causas de baja sugeridas: `Renuncia`, `Despido`, `Jubilación`, `Fallecimiento`, `Fin de contrato`, `Otro`. La acción registra una entrada en `auditoria` (entidad `user_role`, acción `editar`).

> El índice único parcial sobre `personal(persona_id) WHERE fecha_baja IS NULL` impide tener dos legajos activos para la misma persona. Para reasignar de sucursal: dar de baja el actual y crear uno nuevo.
