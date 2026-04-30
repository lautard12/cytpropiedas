# 2. Arquitectura

## Stack
| Capa | Tecnología |
|---|---|
| Frontend | React 18 + TypeScript + Vite 5 |
| UI | Tailwind CSS + shadcn/ui + lucide-react |
| Estado servidor | TanStack Query v5 |
| Formularios / validación | React Hook Form + Zod |
| Routing | React Router v6 |
| Backend / DB | Lovable Cloud (PostgreSQL gestionado + API REST/PostgREST) |
| Autenticación | Lovable Cloud Auth (email/password) — operativa |
| Edge Functions | Deno (`bootstrap-admin`, `create-personal`) |
| Hosting | Lovable Cloud |
| Charts | Recharts |
| Fechas | date-fns |

## Arquitectura por capas

```
┌────────────────────────────────────────────────────────────┐
│ UI (src/pages, src/components)                             │
│   - Páginas listado/detalle                                │
│   - Diálogos (Persona, Propiedad, Sucursal, Personal,      │
│     PersonalBaja, RegistrarPago, AnularPago)               │
└──────────────────────────┬─────────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────────┐
│ Hooks de datos (src/hooks)                                 │
│   - useSupabaseData.ts        → lecturas con React Query   │
│   - usePersonaMutations.ts    → upsert/delete propietarios │
│   - usePropiedadMutations.ts  → ABM propiedades            │
│   - usePagoMutations.ts       → registrar/anular pagos     │
│   - useOrganizacion.ts        → org + sucursales           │
│   - useAuditoria.ts           → bitácora                   │
└──────────────────────────┬─────────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────────┐
│ Cliente Supabase (src/integrations/supabase/client.ts)     │
│   - Tipado generado en types.ts                            │
│   - AuthContext con onAuthStateChange + getSession         │
└──────────────────────────┬─────────────────────────────────┘
                           │ HTTPS / PostgREST + RPC + Edge
┌──────────────────────────▼─────────────────────────────────┐
│ Lovable Cloud (PostgreSQL + Auth + Storage + Edge Funcs)   │
│   - Tablas dominio + auth/org + auditoría                  │
│   - RLS por rol (`has_role(uid, 'admin'|'administrativo')`)│
│   - Triggers (set_updated_at, recalc, sync, log)           │
│   - RPCs (anular_pago, upsert_propietario, upsert_inquilino)│
│   - Edge Functions (bootstrap-admin, create-personal)      │
└────────────────────────────────────────────────────────────┘
```

## Estructura de carpetas relevante

```
src/
├── pages/               # Dashboard, Auth, Propiedades, Contratos,
│                        # Liquidaciones, Pagos, Propietarios,
│                        # Inquilinos, MiOrganizacion, Auditoria, ...
├── components/
│   ├── layout/          # AppLayout, Sidebar, Topbar
│   ├── PersonaFormDialog.tsx
│   ├── PropiedadFormDialog.tsx
│   ├── SucursalFormDialog.tsx
│   ├── PersonalFormDialog.tsx
│   ├── PersonalBajaDialog.tsx
│   ├── RegistrarPagoDialog.tsx
│   ├── AnularPagoDialog.tsx
│   ├── ProtectedRoute.tsx
│   └── ui/              # shadcn primitives
├── hooks/
│   ├── useSupabaseData.ts
│   ├── usePersonaMutations.ts
│   ├── usePropiedadMutations.ts
│   ├── usePagoMutations.ts
│   ├── useOrganizacion.ts
│   ├── useAuditoria.ts
│   └── use-toast.ts
├── contexts/AuthContext.tsx
├── integrations/supabase/
│   ├── client.ts        # autogenerado, NO editar
│   └── types.ts         # autogenerado, NO editar
├── lib/audit.ts         # helper logAudit(...)
└── lib/utils.ts
supabase/
├── functions/
│   ├── bootstrap-admin/
│   └── create-personal/
└── migrations/          # historial DDL
```

## Decisiones técnicas

1. **Persona como maestro único + tablas específicas 1-a-1** (`propietarios`,
   `inquilinos`). No hay tabla `personas_roles` ni enum `rol_persona`: los
   "roles de dominio" son **derivados** de la existencia de filas en esas
   tablas. Esto evita duplicación cuando una persona cumple varios roles y
   elimina la complejidad de un trigger de sincronización.
2. **Roles de aplicación separados de roles de dominio**: `roles` (catálogo
   `app_role`) + `user_roles` (N:M con `usuarios`). RLS usa `has_role(uid, role)`
   (SECURITY DEFINER) sobre `user_roles`.
3. **Vínculo persona ↔ usuario en `usuarios.persona_id`** (no al revés). Una
   persona puede no tener usuario; un usuario puede no tener persona.
4. **Personal con ciclo de vida**: `personal` registra el legajo
   persona ↔ sucursal con alta/baja. Índice único parcial garantiza un solo
   legajo activo por persona.
5. **Cálculos financieros**: la generación de liquidaciones y los conceptos
   se computan en el frontend; los recálculos por pagos los hace un trigger
   de DB (`recalc_liquidacion_totales`); la anulación de pagos se hace por
   RPC atómica (`anular_pago`).
6. **Cache** vía `queryKey` con invalidación selectiva en mutaciones.
7. **Sin backend Node propio**: PostgREST + edge functions cubren las
   necesidades (creación de personal con service role, bootstrap del admin).
8. **Auditoría** inmutable (`auditoria`): solo INSERT/SELECT permitidos por
   RLS; lectura solo para `admin`.
