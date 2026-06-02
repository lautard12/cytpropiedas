# Documentación — CyT Propiedades

Sistema de administración inmobiliaria (alquileres residenciales/comerciales en Argentina).
Reemplaza el manejo manual en Excel por un sistema integral de propiedades, contratos,
liquidaciones mensuales y cobranzas.

## Índice

### 1. Producto y arquitectura
- [`01-vision-general.md`](./01-vision-general.md) — Qué es, para quién, alcance funcional.
- [`02-arquitectura.md`](./02-arquitectura.md) — Stack, capas, decisiones técnicas.

### 2. Datos
- [`03-modelo-de-datos.md`](./03-modelo-de-datos.md) — Entidades, atributos, reglas.
- [`diagramas/der.mmd`](./diagramas/der.mmd) — Diagrama Entidad-Relación (Mermaid).
- [`diagramas/estados-liquidacion.mmd`](./diagramas/estados-liquidacion.mmd) — Máquina de estados.
- [`db/schema.sql`](./db/schema.sql) — Script DDL completo (tablas, enums, índices).
- [`db/triggers.sql`](./db/triggers.sql) — Triggers, funciones y políticas RLS.
- [`db/seed.sql`](./db/seed.sql) — Datos de ejemplo opcionales.

### 3. Auth, organización y auditoría
- [`10-auth-y-organizacion.md`](./10-auth-y-organizacion.md) — Usuarios, roles (`admin`/`administrativo`), `personal` con alta/baja, organización, sucursales y auditoría.

### 4. API / Endpoints (firmas por pantalla)
- [`endpoints/README.md`](./endpoints/README.md) — Convenciones y autenticación.
- [`endpoints/personas.md`](./endpoints/personas.md) — Módulo unificado de personas (propietarios, inquilinos, garantes) y personal del staff.
- [`endpoints/propiedades.md`](./endpoints/propiedades.md)
- [`endpoints/contratos.md`](./endpoints/contratos.md)
- [`endpoints/liquidaciones.md`](./endpoints/liquidaciones.md)
- [`endpoints/pagos.md`](./endpoints/pagos.md) — Incluye RPC `anular_pago`.
- [`endpoints/eventos.md`](./endpoints/eventos.md)
- [`endpoints/dashboard-reportes.md`](./endpoints/dashboard-reportes.md)

### 5. Flujos de negocio
- [`flujos/01-alta-contrato.md`](./flujos/01-alta-contrato.md)
- [`flujos/02-generacion-liquidacion.md`](./flujos/02-generacion-liquidacion.md)
- [`flujos/03-cobranza-y-pagos.md`](./flujos/03-cobranza-y-pagos.md)
- [`flujos/04-rendicion-al-propietario.md`](./flujos/04-rendicion-al-propietario.md)
- [`flujos/05-ajustes-icl-ipc.md`](./flujos/05-ajustes-icl-ipc.md)
- [`flujos/06-cierre-contrato.md`](./flujos/06-cierre-contrato.md)
- [`flujos/07-deteccion-duplicados-personas.md`](./flujos/07-deteccion-duplicados-personas.md)
- [`flujos/08-gastos-y-arreglos.md`](./flujos/08-gastos-y-arreglos.md) — Quién paga cada arreglo y cómo se carga en la liquidación.

### 6. Pantallas
- [`04-pantallas.md`](./04-pantallas.md) — Mapa de rutas, propósito, datos consumidos.

### 7. Glosario
- [`05-glosario.md`](./05-glosario.md) — TGI, API, ICL, comisión, neto propietario, roles, personal, etc.
