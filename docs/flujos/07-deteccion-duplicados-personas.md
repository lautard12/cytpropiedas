# Flujo 07 — Detección de duplicados al alta de personas

**Pantallas:** `/propietarios`, `/inquilinos` → `PersonaFormDialog`.

## Problema
Una persona puede ser **propietaria** de un inmueble e **inquilina** de otro al
mismo tiempo. Si se cargan dos veces, se rompen reportes, totalizadores y la
trazabilidad por persona.

## Solución
**Una sola tabla `personas`** con datos básicos, y dos tablas específicas
(`propietarios`, `inquilinos`) en relación 1-a-1. Antes de crear un nuevo
registro, el frontend busca duplicados por **DNI**, **CUIT** o **email** sobre
`personas`. Si la persona ya existe, se reutiliza su `persona_id` y se inserta
solo la fila del rol nuevo (vía `upsert_propietario` / `upsert_inquilino`).

## Pasos

1. Operadora hace click en "Nuevo propietario" (o inquilino).
2. Carga DNI / CUIT / email.
3. **onBlur** del último campo de identidad ⇒ ejecuta `findPersonaByIdentity`.
4. Si existe match:
   - Mostrar tarjeta con datos del existente.
   - Si **ya tiene el rol que estoy intentando cargar** ⇒ deshabilitar submit y
     ofrecer "Ir a la ficha".
   - Si **no tiene ese rol** ⇒ ofrecer botón "Agregar rol a esta persona"
     ⇒ `useAddRolToPersona`.
5. Si no hay match ⇒ submit normal con `useCreatePersona`.

## Eliminación segura

Antes de eliminar:
- `GET /contratos?or=(propietario_id.eq.X,inquilino_id.eq.X)&estado=eq.Activo`
- `GET /propiedades?propietario_id=eq.X`

Si hay resultados ⇒ **bloquear** con modal explicativo listando los vínculos.
Si no hay ⇒ ejecutar `useRemoveRolOrDeletePersona` (quita rol o elimina la
persona si era su último rol).

## Diagrama

```mermaid
flowchart TD
    A[Operadora abre Nuevo Propietario] --> B[Carga DNI/CUIT/Email]
    B --> C{findPersonaByIdentity}
    C -- No existe --> D[Submit: crear persona + rol]
    C -- Existe sin este rol --> E[Botón: Agregar rol]
    C -- Existe con este rol --> F[Bloquear + ir a ficha]
    E --> G[POST personas_roles]
    D --> H[Redirect ficha]
    G --> H
```
