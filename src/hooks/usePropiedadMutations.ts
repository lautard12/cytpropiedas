import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logAudit } from '@/lib/audit';
import type { Propiedad } from '@/hooks/useSupabaseData';

export interface PropiedadFormValues {
  direccion: string;
  unidad: string;
  tipo: string;
  propietario_id: string | null;
  estado: string;
  metros: number;
  ambientes: number;
  observaciones: string;
  latitud: number | null;
  longitud: number | null;
  matricula_catastral: string;
}

export const emptyPropiedadForm: PropiedadFormValues = {
  direccion: '', unidad: '', tipo: 'Departamento', propietario_id: null,
  estado: 'Vacante', metros: 0, ambientes: 1, observaciones: '',
  latitud: null, longitud: null, matricula_catastral: '',
};

export function useCreatePropiedad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: PropiedadFormValues) => {
      const { data, error } = await supabase.from('propiedades').insert(values as any).select().single();
      if (error) throw error;
      await logAudit({ accion: 'crear', entidad: 'propiedad', entidad_id: data.id, datos_despues: data, descripcion: `Propiedad creada: ${data.direccion} ${data.unidad}` });
      return data as Propiedad;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['propiedades'] }),
  });
}

export function useUpdatePropiedad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: PropiedadFormValues }) => {
      const { data: antes } = await supabase.from('propiedades').select('*').eq('id', id).maybeSingle();
      const { data, error } = await supabase.from('propiedades').update(values as any).eq('id', id).select().single();
      if (error) throw error;
      await logAudit({ accion: 'editar', entidad: 'propiedad', entidad_id: id, datos_antes: antes, datos_despues: data, descripcion: `Propiedad editada: ${data.direccion} ${data.unidad}` });
      return data as Propiedad;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['propiedades'] }),
  });
}

export function useDeletePropiedad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: antes } = await supabase.from('propiedades').select('*').eq('id', id).maybeSingle();
      // Validar contratos activos
      const { count } = await supabase.from('contratos').select('id', { count: 'exact', head: true })
        .eq('propiedad_id', id).eq('estado', 'Activo');
      if ((count ?? 0) > 0) throw new Error('La propiedad tiene contratos activos. No se puede eliminar.');
      const { error } = await supabase.from('propiedades').delete().eq('id', id);
      if (error) throw error;
      await logAudit({ accion: 'eliminar', entidad: 'propiedad', entidad_id: id, datos_antes: antes, descripcion: `Propiedad eliminada: ${antes?.direccion}` });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['propiedades'] }),
  });
}
