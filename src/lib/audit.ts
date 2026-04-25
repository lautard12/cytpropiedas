import { supabase } from '@/integrations/supabase/client';

type Accion = 'crear' | 'editar' | 'eliminar' | 'anular' | 'otro';
type Entidad = 'contrato' | 'liquidacion' | 'pago' | 'concepto' | 'propiedad' | 'persona' | 'organizacion' | 'sucursal' | 'user_role';

export interface AuditEntry {
  accion: Accion;
  entidad: Entidad;
  entidad_id?: string | null;
  descripcion?: string;
  datos_antes?: any;
  datos_despues?: any;
  monto?: number | null;
}

export async function logAudit(entry: AuditEntry) {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('auditoria').insert({
    user_id: user?.id ?? null,
    user_email: user?.email ?? '',
    accion: entry.accion,
    entidad: entry.entidad,
    entidad_id: entry.entidad_id ?? null,
    descripcion: entry.descripcion ?? '',
    datos_antes: entry.datos_antes ?? null,
    datos_despues: entry.datos_despues ?? null,
    monto: entry.monto ?? null,
  });
}
