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
| Autenticación | Lovable Cloud Auth (email/password + Google OAuth) — *en roadmap* |
| Hosting | Lovable Cloud |
| Charts | Recharts |
| Fechas | date-fns |

## Arquitectura por capas

```
┌────────────────────────────────────────────────────────────┐
│ UI (src/pages, src/components)                             │
│   - Páginas listado/detalle                                │
│   - Diálogos (Persona, RegistrarPago)                      │
└──────────────────────────┬─────────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────────┐
│ Hooks de datos (src/hooks)                                 │
│   - useSupabaseData.ts  → lecturas con React Query         │
│   - usePersonaMutations.ts → mutaciones + invalidación     │
└──────────────────────────┬─────────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────────┐
│ Cliente Supabase (src/integrations/supabase/client.ts)     │
│   - Tipado generado en types.ts                            │
└──────────────────────────┬─────────────────────────────────┘
                           │ HTTPS / PostgREST
┌──────────────────────────▼─────────────────────────────────┐
│ Lovable Cloud (PostgreSQL + Auth + Storage + Edge Funcs)   │
│   - Tablas (8) + enums (5)                                 │
│   - RLS policies                                           │
│   - Triggers updated_at                                    │
└────────────────────────────────────────────────────────────┘
```

## Estructura de carpetas relevante

```
src/
├── pages/               # 17 rutas
├── components/
│   ├── layout/          # AppLayout, Sidebar, Topbar
│   ├── PersonaFormDialog.tsx
│   ├── RegistrarPagoDialog.tsx
│   └── ui/              # shadcn primitives
├── hooks/
│   ├── useSupabaseData.ts
│   ├── usePersonaMutations.ts
│   └── use-toast.ts
├── integrations/supabase/
│   ├── client.ts        # autogenerado, NO editar
│   └── types.ts         # autogenerado, NO editar
└── lib/utils.ts
```

## Decisiones técnicas
1. **Modelo unificado de personas**: una sola tabla `personas` con tabla puente
   `personas_roles`, en lugar de `propietarios` + `inquilinos` separadas. Evita
   duplicación cuando una persona cumple dos roles.
2. **Hooks aliasados** (`usePropietarios = usePersonas('propietario')`) para mantener
   compatibilidad con páginas existentes durante la migración.
3. **Toda la lógica de cálculo financiero** vive en el frontend al generar la liquidación
   y al registrar pagos. Más adelante puede moverse a edge functions para auditoría.
4. **Cache** vía `queryKey` con invalidación selectiva en mutaciones.
5. **Sin backend Node propio**: PostgREST + edge functions cubren las necesidades.
