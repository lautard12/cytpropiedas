import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AuditoriaRow {
  id: string;
  created_at: string;
  user_id: string | null;
  user_email: string;
  accion: string;
  entidad: string;
  entidad_id: string | null;
  descripcion: string;
  datos_antes: any;
  datos_despues: any;
  monto: number | null;
}

interface Filtros {
  entidad?: string;
  accion?: string;
  desde?: string;
  hasta?: string;
}

export function useAuditoria(filtros: Filtros = {}) {
  return useQuery({
    queryKey: ['auditoria', filtros],
    queryFn: async () => {
      let q = supabase.from('auditoria').select('*').order('created_at', { ascending: false }).limit(500);
      if (filtros.entidad && filtros.entidad !== 'todas') q = q.eq('entidad', filtros.entidad);
      if (filtros.accion && filtros.accion !== 'todas') q = q.eq('accion', filtros.accion);
      if (filtros.desde) q = q.gte('created_at', filtros.desde);
      if (filtros.hasta) q = q.lte('created_at', filtros.hasta + 'T23:59:59');
      const { data, error } = await q;
      if (error) throw error;
      return data as AuditoriaRow[];
    },
  });
}
