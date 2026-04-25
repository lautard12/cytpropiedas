# Endpoints / Firmas por pantalla

## Convenciones

El backend es **PostgREST sobre Lovable Cloud**. No hay endpoints REST escritos a mano:
cada operación se expresa como llamada al cliente Supabase JS, que se traduce a una
request HTTP estándar.

Cada documento de esta carpeta agrupa las operaciones por pantalla y muestra:
- **Firma frontend** (TypeScript) — cómo la consume el hook React.
- **Operación backend equivalente** (verbo HTTP + recurso PostgREST).
- **Body / query** y **respuesta**.
- **Errores controlados**.

### Cliente

```ts
import { supabase } from '@/integrations/supabase/client';
```

### Autenticación
- **MVP actual**: políticas RLS abiertas (`USING (true)`). No requiere token.
- **Producción**: se enviará `Authorization: Bearer <jwt>` automáticamente por el cliente
  Supabase tras login. Ver `docs/02-arquitectura.md`.

### Headers comunes (PostgREST)
```
apikey: <SUPABASE_PUBLISHABLE_KEY>
Authorization: Bearer <jwt | apikey>
Content-Type: application/json
Prefer: return=representation   # para devolver el row insertado/actualizado
```

### Errores estándar
| Código | Significado típico |
|---|---|
| 400 | Body inválido (tipo o restricción) |
| 401 | Falta JWT o expirado |
| 403 | RLS bloquea la operación |
| 404 | Recurso no existe |
| 409 | Violación de constraint (UNIQUE, FK) |
| 422 | Validación zod en frontend (no llega al backend) |

### Índice por pantalla
| Pantalla | Documento |
|---|---|
| Propietarios / Inquilinos | [`personas.md`](./personas.md) |
| Propiedades | [`propiedades.md`](./propiedades.md) |
| Contratos / Nuevo Contrato | [`contratos.md`](./contratos.md) |
| Liquidaciones / Generar Liquidación | [`liquidaciones.md`](./liquidaciones.md) |
| Pagos | [`pagos.md`](./pagos.md) |
| Historial / timeline | [`eventos.md`](./eventos.md) |
| Dashboard / Reportes | [`dashboard-reportes.md`](./dashboard-reportes.md) |
