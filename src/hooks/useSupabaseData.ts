import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ─── Types matching DB schema ─────────────────────────────
export type RolPersona = 'propietario' | 'inquilino' | 'garante';

export interface Persona {
  id: string;
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
  roles: RolPersona[];
}

// Backwards-compat aliases — the rest of the app keeps working unchanged.
export type Propietario = Persona;
export type Inquilino = Persona;

export interface Propiedad {
  id: string;
  direccion: string;
  unidad: string;
  tipo: string;
  propietario_id: string | null;
  estado: string;
  contrato_activo_id: string | null;
  metros: number;
  ambientes: number;
  observaciones: string;
}

export interface Contrato {
  id: string;
  codigo: string;
  propiedad_id: string | null;
  propietario_id: string | null;
  inquilino_id: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  alquiler_base: number;
  tipo_ajuste: string;
  frecuencia_ajuste: string;
  dia_vencimiento: number;
  comision_porcentaje: number;
  iva: boolean;
  tgi: string;
  api: string;
  expensas_ordinarias: string;
  expensas_extraordinarias: string;
  seguro: string;
  servicios: string;
  reglas_observaciones: string;
}

export interface Liquidacion {
  id: string;
  contrato_id: string;
  periodo: string;
  periodo_label: string;
  fecha_emision: string;
  estado: string;
  subtotal: number;
  total_cobrar: number;
  total_cobrado: number;
  pendiente: number;
  comision_inmobiliaria: number;
  neto_propietario: number;
  saldo_anterior: number;
  observaciones: string;
}

export interface ConceptoLiquidacion {
  id: string;
  liquidacion_id: string;
  concepto: string;
  monto: number;
  responsable: string;
  aplica_al_inquilino: boolean;
}

export interface Pago {
  id: string;
  liquidacion_id: string;
  contrato_id: string;
  fecha: string;
  monto: number;
  medio_pago: string;
  referencia: string;
  estado: string;
  observaciones: string;
}

export interface EventoContrato {
  id: string;
  contrato_id: string;
  liquidacion_id: string | null;
  periodo: string | null;
  fecha: string;
  tipo: string;
  categoria: 'contractual' | 'financiero' | 'administrativo' | 'documental';
  descripcion: string;
  monto: number | null;
  documento_url: string | null;
  created_at: string;
}

// ─── Queries ──────────────────────────────────────────────

export function usePropietarios() {
  return useQuery({
    queryKey: ['propietarios'],
    queryFn: async () => {
      const { data, error } = await supabase.from('propietarios').select('*').order('nombre');
      if (error) throw error;
      return data as Propietario[];
    },
  });
}

export function usePropietario(id: string) {
  return useQuery({
    queryKey: ['propietarios', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('propietarios').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data as Propietario | null;
    },
    enabled: !!id,
  });
}

export function useInquilinos() {
  return useQuery({
    queryKey: ['inquilinos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('inquilinos').select('*').order('nombre');
      if (error) throw error;
      return data as Inquilino[];
    },
  });
}

export function useInquilino(id: string) {
  return useQuery({
    queryKey: ['inquilinos', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('inquilinos').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data as Inquilino | null;
    },
    enabled: !!id,
  });
}

export function usePropiedades() {
  return useQuery({
    queryKey: ['propiedades'],
    queryFn: async () => {
      const { data, error } = await supabase.from('propiedades').select('*').order('direccion');
      if (error) throw error;
      return data as Propiedad[];
    },
  });
}

export function usePropiedad(id: string) {
  return useQuery({
    queryKey: ['propiedades', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('propiedades').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data as Propiedad | null;
    },
    enabled: !!id,
  });
}

export function useContratos() {
  return useQuery({
    queryKey: ['contratos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('contratos').select('*').order('codigo');
      if (error) throw error;
      return data as Contrato[];
    },
  });
}

export function useContrato(id: string) {
  return useQuery({
    queryKey: ['contratos', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('contratos').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data as Contrato | null;
    },
    enabled: !!id,
  });
}

export function useLiquidaciones() {
  return useQuery({
    queryKey: ['liquidaciones'],
    queryFn: async () => {
      const { data, error } = await supabase.from('liquidaciones').select('*').order('periodo', { ascending: false });
      if (error) throw error;
      return data as Liquidacion[];
    },
  });
}

export function useLiquidacion(id: string) {
  return useQuery({
    queryKey: ['liquidaciones', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('liquidaciones').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data as Liquidacion | null;
    },
    enabled: !!id,
  });
}

export function useConceptosLiquidacion(liquidacionId: string) {
  return useQuery({
    queryKey: ['conceptos_liquidacion', liquidacionId],
    queryFn: async () => {
      const { data, error } = await supabase.from('conceptos_liquidacion').select('*').eq('liquidacion_id', liquidacionId);
      if (error) throw error;
      return data as ConceptoLiquidacion[];
    },
    enabled: !!liquidacionId,
  });
}

export function usePagos() {
  return useQuery({
    queryKey: ['pagos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pagos').select('*').order('fecha', { ascending: false });
      if (error) throw error;
      return data as Pago[];
    },
  });
}

export function usePagosByLiquidacion(liquidacionId: string) {
  return useQuery({
    queryKey: ['pagos', 'liquidacion', liquidacionId],
    queryFn: async () => {
      const { data, error } = await supabase.from('pagos').select('*').eq('liquidacion_id', liquidacionId);
      if (error) throw error;
      return data as Pago[];
    },
    enabled: !!liquidacionId,
  });
}

export function useEventosContrato(contratoId: string) {
  return useQuery({
    queryKey: ['eventos_contrato', contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('eventos_contrato')
        .select('*')
        .eq('contrato_id', contratoId)
        .order('fecha', { ascending: true });
      if (error) throw error;
      return data as EventoContrato[];
    },
    enabled: !!contratoId,
  });
}

export function useEventosPorPeriodo(contratoId: string, periodo: string) {
  return useQuery({
    queryKey: ['eventos_contrato', contratoId, periodo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('eventos_contrato')
        .select('*')
        .eq('contrato_id', contratoId)
        .or(`periodo.eq.${periodo},fecha.gte.${periodo}-01,fecha.lte.${periodo}-31`)
        .order('fecha', { ascending: true });
      if (error) throw error;
      // Filter client-side for accurate period matching
      return (data as EventoContrato[]).filter(e =>
        e.periodo === periodo || (e.fecha >= `${periodo}-01` && e.fecha <= `${periodo}-31`)
      );
    },
    enabled: !!contratoId && !!periodo,
  });
}

export function useEventosRecientes(limit = 10) {
  return useQuery({
    queryKey: ['eventos_contrato', 'recientes', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('eventos_contrato')
        .select('*')
        .order('fecha', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as EventoContrato[];
    },
  });
}

export function useContratosByPropiedad(propiedadId: string) {
  return useQuery({
    queryKey: ['contratos', 'propiedad', propiedadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contratos')
        .select('*')
        .eq('propiedad_id', propiedadId)
        .order('fecha_inicio', { ascending: false });
      if (error) throw error;
      return data as Contrato[];
    },
    enabled: !!propiedadId,
  });
}

// ─── Helpers ──────────────────────────────────────────────

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Lookup helpers for use with already-fetched arrays
export function findById<T extends { id: string }>(arr: T[] | undefined, id: string | null): T | undefined {
  if (!arr || !id) return undefined;
  return arr.find(item => item.id === id);
}

// Monthly evolution static data (kept for charts until we compute from DB)
export const evolucionMensual = [
  { mes: 'Oct 2024', cobrado: 1850000, pendiente: 120000, comision: 185000 },
  { mes: 'Nov 2024', cobrado: 1920000, pendiente: 95000, comision: 192000 },
  { mes: 'Dic 2024', cobrado: 2100000, pendiente: 180000, comision: 210000 },
  { mes: 'Ene 2025', cobrado: 2250000, pendiente: 150000, comision: 225000 },
  { mes: 'Feb 2025', cobrado: 2350000, pendiente: 80000, comision: 235000 },
  { mes: 'Mar 2025', cobrado: 2316200, pendiente: 563500, comision: 230200 },
];
