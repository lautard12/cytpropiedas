import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Propietario, Inquilino, RolPersona } from './useSupabaseData';

/** Datos básicos comunes a cualquier persona. */
export type PersonaBaseValues = {
  nombre: string;
  dni: string;
  cuit: string;
  email: string;
  telefono: string;
  direccion: string;
  observaciones: string;
};

/** Datos específicos de un propietario. */
export type PropietarioValues = PersonaBaseValues & {
  banco: string;
  cbu: string;
  alias_cbu: string;
  condicion_iva: string;
  observaciones_fiscales: string;
};

/** Datos específicos de un inquilino. */
export type InquilinoValues = PersonaBaseValues & {
  garante_nombre: string;
  garante_telefono: string;
  garante_dni: string;
  ocupacion: string;
  ingresos_declarados: number;
  observaciones_inquilino: string;
};

/** Compat: viejo type usado por PersonaFormDialog y otros lugares. */
export type PersonaFormValues = PersonaBaseValues & {
  banco: string;
  cbu: string;
  garante: string;
  garante_telefono: string;
};

export const emptyPersonaForm: PersonaFormValues = {
  nombre: '',
  dni: '',
  cuit: '',
  email: '',
  telefono: '',
  direccion: '',
  observaciones: '',
  banco: '',
  cbu: '',
  garante: '',
  garante_telefono: '',
};

/** Búsqueda de persona existente por DNI / CUIT / email. */
export async function findPersonaByIdentity(values: {
  dni: string;
  cuit: string;
  email: string;
}): Promise<{
  id: string; // personas.id
  nombre: string;
  roles: RolPersona[];
  propietario_id?: string;
  inquilino_id?: string;
} | null> {
  const filters: string[] = [];
  if (values.dni.trim()) filters.push(`dni.eq.${values.dni.trim()}`);
  if (values.cuit.trim()) filters.push(`cuit.eq.${values.cuit.trim()}`);
  if (values.email.trim()) filters.push(`email.eq.${values.email.trim().toLowerCase()}`);
  if (filters.length === 0) return null;

  const { data, error } = await (supabase as any)
    .from('personas')
    .select('id, nombre, personas_roles(rol), propietarios(id), inquilinos(id)')
    .or(filters.join(','))
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    nombre: data.nombre,
    roles: (data.personas_roles ?? []).map((r: any) => r.rol as RolPersona),
    propietario_id: data.propietarios?.[0]?.id,
    inquilino_id: data.inquilinos?.[0]?.id,
  };
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['propietarios'] });
  qc.invalidateQueries({ queryKey: ['inquilinos'] });
  qc.invalidateQueries({ queryKey: ['personas'] });
}

// ─── Propietarios ─────────────────────────────────────────

export function useUpsertPropietario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      personaId,
      values,
    }: {
      personaId: string | null; // si existe, reusa la persona
      values: PropietarioValues;
    }) => {
      const { data, error } = await (supabase as any).rpc('upsert_propietario', {
        _persona_id: personaId,
        _nombre: values.nombre.trim(),
        _dni: values.dni.trim(),
        _cuit: values.cuit.trim(),
        _email: values.email.trim().toLowerCase(),
        _telefono: values.telefono.trim(),
        _direccion: values.direccion.trim(),
        _observaciones: values.observaciones.trim(),
        _banco: values.banco.trim(),
        _cbu: values.cbu.trim(),
        _alias_cbu: values.alias_cbu.trim(),
        _condicion_iva: values.condicion_iva.trim() || 'Consumidor Final',
        _observaciones_fiscales: values.observaciones_fiscales.trim(),
      });
      if (error) throw error;
      return data as string; // propietarios.id
    },
    onSuccess: () => invalidate(qc),
  });
}

/**
 * Elimina un propietario (rol). Si la persona no tiene otros vínculos
 * el cascade del FK borra también la persona si así lo decide la app.
 * Por seguridad solo eliminamos la fila de propietarios; personas_roles
 * se sincroniza por trigger.
 */
export function useDeletePropietario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ propietarioId, personaId }: { propietarioId: string; personaId: string }) => {
      const { error } = await (supabase as any)
        .from('propietarios')
        .delete()
        .eq('id', propietarioId);
      if (error) throw error;

      // Si la persona ya no tiene ningún rol (propietarios + inquilinos), borrarla.
      const [{ count: cP }, { count: cI }] = await Promise.all([
        (supabase as any).from('propietarios').select('id', { count: 'exact', head: true }).eq('persona_id', personaId),
        (supabase as any).from('inquilinos').select('id', { count: 'exact', head: true }).eq('persona_id', personaId),
      ]);
      if ((cP ?? 0) === 0 && (cI ?? 0) === 0) {
        await (supabase as any).from('personas').delete().eq('id', personaId);
      }
    },
    onSuccess: () => invalidate(qc),
  });
}

// ─── Inquilinos ───────────────────────────────────────────

export function useUpsertInquilino() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      personaId,
      values,
    }: {
      personaId: string | null;
      values: InquilinoValues;
    }) => {
      const { data, error } = await (supabase as any).rpc('upsert_inquilino', {
        _persona_id: personaId,
        _nombre: values.nombre.trim(),
        _dni: values.dni.trim(),
        _cuit: values.cuit.trim(),
        _email: values.email.trim().toLowerCase(),
        _telefono: values.telefono.trim(),
        _direccion: values.direccion.trim(),
        _observaciones: values.observaciones.trim(),
        _garante_nombre: values.garante_nombre.trim(),
        _garante_telefono: values.garante_telefono.trim(),
        _garante_dni: values.garante_dni.trim(),
        _ocupacion: values.ocupacion.trim(),
        _ingresos_declarados: values.ingresos_declarados || 0,
        _observaciones_inquilino: values.observaciones_inquilino.trim(),
      });
      if (error) throw error;
      return data as string; // inquilinos.id
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteInquilino() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ inquilinoId, personaId }: { inquilinoId: string; personaId: string }) => {
      const { error } = await (supabase as any)
        .from('inquilinos')
        .delete()
        .eq('id', inquilinoId);
      if (error) throw error;

      const [{ count: cP }, { count: cI }] = await Promise.all([
        (supabase as any).from('propietarios').select('id', { count: 'exact', head: true }).eq('persona_id', personaId),
        (supabase as any).from('inquilinos').select('id', { count: 'exact', head: true }).eq('persona_id', personaId),
      ]);
      if ((cP ?? 0) === 0 && (cI ?? 0) === 0) {
        await (supabase as any).from('personas').delete().eq('id', personaId);
      }
    },
    onSuccess: () => invalidate(qc),
  });
}

// ─── Compat con PersonaFormDialog antiguo ─────────────────
// Mantienen las firmas viejas; bajo el capó usan los upserts nuevos.

export function useCreatePersona() {
  const upsertProp = useUpsertPropietario();
  const upsertInq = useUpsertInquilino();
  return {
    isPending: upsertProp.isPending || upsertInq.isPending,
    mutateAsync: async ({ values, rol }: { values: PersonaFormValues; rol: RolPersona }) => {
      if (rol === 'propietario') {
        return upsertProp.mutateAsync({
          personaId: null,
          values: {
            ...values,
            alias_cbu: '',
            condicion_iva: 'Consumidor Final',
            observaciones_fiscales: '',
          },
        });
      }
      if (rol === 'inquilino') {
        return upsertInq.mutateAsync({
          personaId: null,
          values: {
            ...values,
            garante_nombre: values.garante,
            garante_dni: '',
            ocupacion: '',
            ingresos_declarados: 0,
            observaciones_inquilino: '',
          },
        });
      }
      throw new Error('Rol no soportado en este formulario');
    },
  };
}

export function useUpdatePersona() {
  const upsertProp = useUpsertPropietario();
  const upsertInq = useUpsertInquilino();
  return {
    isPending: upsertProp.isPending || upsertInq.isPending,
    /**
     * id: el id mostrado en la pantalla (propietarios.id o inquilinos.id).
     * Como personaId no se conoce desde acá, lo busca primero.
     */
    mutateAsync: async ({
      id,
      values,
      rol,
    }: {
      id: string;
      values: PersonaFormValues;
      rol: RolPersona;
    }) => {
      const table = rol === 'propietario' ? 'propietarios' : 'inquilinos';
      const { data: row, error } = await (supabase as any)
        .from(table)
        .select('persona_id')
        .eq('id', id)
        .single();
      if (error) throw error;
      if (rol === 'propietario') {
        return upsertProp.mutateAsync({
          personaId: row.persona_id,
          values: {
            ...values,
            alias_cbu: '',
            condicion_iva: 'Consumidor Final',
            observaciones_fiscales: '',
          },
        });
      }
      return upsertInq.mutateAsync({
        personaId: row.persona_id,
        values: {
          ...values,
          garante_nombre: values.garante,
          garante_dni: '',
          ocupacion: '',
          ingresos_declarados: 0,
          observaciones_inquilino: '',
        },
      });
    },
  };
}

export function useAddRolToPersona() {
  const upsertProp = useUpsertPropietario();
  const upsertInq = useUpsertInquilino();
  return {
    isPending: upsertProp.isPending || upsertInq.isPending,
    mutateAsync: async ({ personaId, rol }: { personaId: string; rol: RolPersona }) => {
      // Crear la fila en propietarios/inquilinos vacía; el trigger sincroniza personas_roles.
      if (rol === 'propietario') {
        const { data: existing } = await (supabase as any).from('personas').select('*').eq('id', personaId).single();
        return upsertProp.mutateAsync({
          personaId,
          values: {
            nombre: existing.nombre, dni: existing.dni, cuit: existing.cuit,
            email: existing.email, telefono: existing.telefono, direccion: existing.direccion,
            observaciones: existing.observaciones,
            banco: '', cbu: '', alias_cbu: '', condicion_iva: 'Consumidor Final',
            observaciones_fiscales: '',
          },
        });
      }
      if (rol === 'inquilino') {
        const { data: existing } = await (supabase as any).from('personas').select('*').eq('id', personaId).single();
        return upsertInq.mutateAsync({
          personaId,
          values: {
            nombre: existing.nombre, dni: existing.dni, cuit: existing.cuit,
            email: existing.email, telefono: existing.telefono, direccion: existing.direccion,
            observaciones: existing.observaciones,
            garante_nombre: '', garante_telefono: '', garante_dni: '',
            ocupacion: '', ingresos_declarados: 0, observaciones_inquilino: '',
          },
        });
      }
      throw new Error('Rol no soportado');
    },
  };
}

export function useRemoveRolOrDeletePersona() {
  const delProp = useDeletePropietario();
  const delInq = useDeleteInquilino();
  return {
    isPending: delProp.isPending || delInq.isPending,
    /** id es propietarios.id o inquilinos.id. */
    mutateAsync: async ({ personaId: id, rol }: { personaId: string; rol: RolPersona }) => {
      const table = rol === 'propietario' ? 'propietarios' : 'inquilinos';
      const { data: row, error } = await (supabase as any)
        .from(table)
        .select('persona_id')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (!row) return;
      if (rol === 'propietario') {
        await delProp.mutateAsync({ propietarioId: id, personaId: row.persona_id });
      } else {
        await delInq.mutateAsync({ inquilinoId: id, personaId: row.persona_id });
      }
    },
  };
}
