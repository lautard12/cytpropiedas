# Endpoints — Personas (Propietarios, Inquilinos, Garantes)

Pantallas: `/propietarios`, `/propietarios/:id`, `/inquilinos`, `/inquilinos/:id`.
Hook principal: `useSupabaseData.ts` + `usePersonaMutations.ts`.

---

## 1. Listar personas por rol

**Hook**
```ts
usePersonas(rol?: RolPersona): UseQueryResult<Persona[]>
// Aliases:
usePropietarios()  // = usePersonas('propietario')
useInquilinos()    // = usePersonas('inquilino')
```

**HTTP equivalente**
```
GET /rest/v1/personas?select=*,personas_roles(rol)&order=nombre.asc
```
Filtrado por rol se hace en cliente.

**Respuesta** `200 OK`
```jsonc
[{
  "id": "uuid", "nombre": "Juan Pérez", "dni": "12.345.678", "cuit": "20-...",
  "email": "juan@x.com", "telefono": "+54...", "direccion": "...",
  "banco": "Galicia", "cbu": "00701...", "garante": "", "garante_telefono": "",
  "observaciones": "", "personas_roles": [{ "rol": "propietario" }]
}]
```

---

## 2. Detalle de persona

**Hook**
```ts
usePersona(id: string): UseQueryResult<Persona | null>
```

**HTTP**
```
GET /rest/v1/personas?id=eq.{id}&select=*,personas_roles(rol)
```

---

## 3. Buscar duplicado por identidad

**Helper** (no hook React)
```ts
findPersonaByIdentity(values: { dni; cuit; email }):
  Promise<(Persona & { roles: RolPersona[] }) | null>
```

**HTTP**
```
GET /rest/v1/personas?or=(dni.eq.X,cuit.eq.Y,email.eq.z@x.com)
    &select=*,personas_roles(rol)&limit=1
```

Usado por `PersonaFormDialog` antes de crear, para sugerir agregar rol en lugar de
duplicar.

---

## 4. Crear persona con rol inicial

**Hook**
```ts
useCreatePersona().mutate({ values: PersonaFormValues, rol: RolPersona })
// Devuelve el id creado.
```

**HTTP** (2 requests en transacción cliente)
```
POST /rest/v1/personas
Body: { nombre, dni, cuit, email, telefono, direccion, banco, cbu,
        garante, garante_telefono, observaciones }

POST /rest/v1/personas_roles
Body: { persona_id, rol }
```

**Errores**
- `409` si email/dni viola un UNIQUE futuro → el frontend debe llamar antes a
  `findPersonaByIdentity`.

---

## 5. Editar persona

**Hook**
```ts
useUpdatePersona().mutate({ id: string, values: PersonaFormValues })
```

**HTTP**
```
PATCH /rest/v1/personas?id=eq.{id}
Body: { ...values }
```

---

## 6. Agregar un rol a persona existente

**Hook**
```ts
useAddRolToPersona().mutate({ personaId: string, rol: RolPersona })
```

**HTTP**
```
POST /rest/v1/personas_roles
Body: { persona_id, rol }
```

`UNIQUE(persona_id, rol)` evita duplicados → `409` ⇒ ignorar.

---

## 7. Quitar rol o eliminar persona

**Hook**
```ts
useRemoveRolOrDeletePersona().mutate({ personaId, rol })
```
Lógica:
1. Lee roles actuales.
2. Si la persona tiene **un solo rol**, elimina la persona (cascada borra `personas_roles`).
3. Si tiene varios, borra solo la fila de `personas_roles` correspondiente.

**HTTP**
```
GET    /rest/v1/personas_roles?persona_id=eq.{id}
DELETE /rest/v1/personas?id=eq.{id}                  // último rol
DELETE /rest/v1/personas_roles?id=eq.{rolRowId}      // rol adicional
```

**Validación previa (frontend)**:
- Si `rol = 'propietario'` ⇒ no debe haber `propiedades.propietario_id = id`
  ni contratos activos vinculados.
- Si `rol = 'inquilino'` ⇒ no debe haber `contratos.inquilino_id = id` activos.
