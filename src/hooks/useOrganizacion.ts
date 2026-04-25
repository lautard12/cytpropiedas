import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logAudit } from '@/lib/audit';

export interface Organizacion {
  id: string;
  nombre: string;
  logo_url: string;
  cuit: string;
  direccion: string;
  telefono: string;
  email: string;
  fecha_alta: string;
  fecha_baja: string | null;
}

export interface Sucursal {
  id: string;
  organizacion_id: string;
  nombre: string;
  direccion: string;
  telefono: string;
  es_central: boolean;
  activa: boolean;
}

export function useOrganizacion() {
  return useQuery({
    queryKey: ['organizacion'],
    queryFn: async () => {
      const { data, error } = await supabase.from('organizacion').select('*').limit(1).maybeSingle();
      if (error) throw error;
      return data as Organizacion | null;
    },
  });
}

export function useSucursales() {
  return useQuery({
    queryKey: ['sucursales'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sucursales').select('*').order('es_central', { ascending: false }).order('nombre');
      if (error) throw error;
      return data as Sucursal[];
    },
  });
}

export function useUpdateOrganizacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Organizacion> & { id: string }) => {
      const { data: antes } = await supabase.from('organizacion').select('*').eq('id', payload.id).maybeSingle();
      const { error, data } = await supabase.from('organizacion').update(payload).eq('id', payload.id).select().single();
      if (error) throw error;
      await logAudit({ accion: 'editar', entidad: 'organizacion', entidad_id: payload.id, datos_antes: antes, datos_despues: data, descripcion: 'Datos de organización actualizados' });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['organizacion'] }),
  });
}

export function useCreateSucursal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<Sucursal, 'id'>) => {
      const { data, error } = await supabase.from('sucursales').insert(payload).select().single();
      if (error) throw error;
      await logAudit({ accion: 'crear', entidad: 'sucursal', entidad_id: data.id, datos_despues: data, descripcion: `Sucursal creada: ${data.nombre}` });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sucursales'] }),
  });
}

export function useUpdateSucursal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Sucursal> & { id: string }) => {
      const { data: antes } = await supabase.from('sucursales').select('*').eq('id', payload.id).maybeSingle();
      const { data, error } = await supabase.from('sucursales').update(payload).eq('id', payload.id).select().single();
      if (error) throw error;
      await logAudit({ accion: 'editar', entidad: 'sucursal', entidad_id: payload.id, datos_antes: antes, datos_despues: data, descripcion: `Sucursal actualizada: ${data.nombre}` });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sucursales'] }),
  });
}

export function useDeleteSucursal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: antes } = await supabase.from('sucursales').select('*').eq('id', id).maybeSingle();
      if (antes?.es_central) throw new Error('No se puede eliminar la sucursal central');
      const { error } = await supabase.from('sucursales').delete().eq('id', id);
      if (error) throw error;
      await logAudit({ accion: 'eliminar', entidad: 'sucursal', entidad_id: id, datos_antes: antes, descripcion: `Sucursal eliminada: ${antes?.nombre}` });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sucursales'] }),
  });
}
