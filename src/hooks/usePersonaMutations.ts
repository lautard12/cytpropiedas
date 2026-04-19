import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Persona, RolPersona } from './useSupabaseData';

export type PersonaFormValues = {
  nombre: string;
  dni: string;
  cuit: string;
  email: string;
  telefono: string;
  direccion: string;
  banco: string;
  cbu: string;
  garante: string;
  garante_telefono: string;
  observaciones: string;
};

export const emptyPersonaForm: PersonaFormValues = {
  nombre: '',
  dni: '',
  cuit: '',
  email: '',
  telefono: '',
  direccion: '',
  banco: '',
  cbu: '',
  garante: '',
  garante_telefono: '',
  observaciones: '',
};

/**
 * Look up an existing person by DNI, CUIT or email (any non-empty match).
 * Returns the persona plus its current roles, or null.
 */
export async function findPersonaByIdentity(
  values: Pick<PersonaFormValues, 'dni' | 'cuit' | 'email'>,
): Promise<(Persona & { roles: RolPersona[] }) | null> {
  const filters: string[] = [];
  if (values.dni.trim()) filters.push(`dni.eq.${values.dni.trim()}`);
  if (values.cuit.trim()) filters.push(`cuit.eq.${values.cuit.trim()}`);
  if (values.email.trim()) filters.push(`email.eq.${values.email.trim().toLowerCase()}`);
  if (filters.length === 0) return null;

  const { data, error } = await supabase
    .from('personas')
    .select('*, personas_roles(rol)')
    .or(filters.join(','))
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const p: any = data;
  return {
    id: p.id,
    nombre: p.nombre,
    dni: p.dni,
    cuit: p.cuit,
    email: p.email,
    telefono: p.telefono,
    direccion: p.direccion,
    banco: p.banco,
    cbu: p.cbu,
    garante: p.garante,
    garante_telefono: p.garante_telefono,
    observaciones: p.observaciones,
    roles: (p.personas_roles ?? []).map((r: any) => r.rol as RolPersona),
  };
}

function invalidatePersonas(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['personas'] });
}

export function useCreatePersona() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ values, rol }: { values: PersonaFormValues; rol: RolPersona }) => {
      const { data, error } = await supabase
        .from('personas')
        .insert({
          nombre: values.nombre.trim(),
          dni: values.dni.trim(),
          cuit: values.cuit.trim(),
          email: values.email.trim().toLowerCase(),
          telefono: values.telefono.trim(),
          direccion: values.direccion.trim(),
          banco: values.banco.trim(),
          cbu: values.cbu.trim(),
          garante: values.garante.trim(),
          garante_telefono: values.garante_telefono.trim(),
          observaciones: values.observaciones.trim(),
        })
        .select('id')
        .single();
      if (error) throw error;
      const { error: rolError } = await supabase
        .from('personas_roles')
        .insert({ persona_id: data.id, rol });
      if (rolError) throw rolError;
      return data.id as string;
    },
    onSuccess: () => invalidatePersonas(qc),
  });
}

export function useUpdatePersona() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: PersonaFormValues }) => {
      const { error } = await supabase
        .from('personas')
        .update({
          nombre: values.nombre.trim(),
          dni: values.dni.trim(),
          cuit: values.cuit.trim(),
          email: values.email.trim().toLowerCase(),
          telefono: values.telefono.trim(),
          direccion: values.direccion.trim(),
          banco: values.banco.trim(),
          cbu: values.cbu.trim(),
          garante: values.garante.trim(),
          garante_telefono: values.garante_telefono.trim(),
          observaciones: values.observaciones.trim(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidatePersonas(qc),
  });
}

export function useAddRolToPersona() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ personaId, rol }: { personaId: string; rol: RolPersona }) => {
      const { error } = await supabase
        .from('personas_roles')
        .insert({ persona_id: personaId, rol });
      if (error) throw error;
    },
    onSuccess: () => invalidatePersonas(qc),
  });
}

/**
 * Removes a single role from a persona. If it's the last role, deletes the persona entirely.
 * Caller is responsible for verifying no active contracts depend on it.
 */
export function useRemoveRolOrDeletePersona() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ personaId, rol }: { personaId: string; rol: RolPersona }) => {
      const { data: rolesData, error: rolesErr } = await supabase
        .from('personas_roles')
        .select('id, rol')
        .eq('persona_id', personaId);
      if (rolesErr) throw rolesErr;
      const roles = (rolesData ?? []) as { id: string; rol: RolPersona }[];
      const target = roles.find(r => r.rol === rol);
      if (!target) return;

      if (roles.length === 1) {
        const { error } = await supabase.from('personas').delete().eq('id', personaId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('personas_roles').delete().eq('id', target.id);
        if (error) throw error;
      }
    },
    onSuccess: () => invalidatePersonas(qc),
  });
}
