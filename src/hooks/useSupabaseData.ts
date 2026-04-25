import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ─── Types matching DB schema ─────────────────────────────
export type RolPersona = 'propietario' | 'inquilino' | 'garante';

/** Datos básicos de la persona física (tabla personas). */
export interface PersonaBase {
  id: string; // personas.id
  nombre: string;
  dni: string;
  cuit: string;
  email: string;
  telefono: string;
  direccion: string;
  observaciones: string;
}

/**
 * Vista unificada de un propietario/inquilino.
 * `id` corresponde al id en la tabla específica (propietarios.id o inquilinos.id),
 * que es lo que referencian propiedades.propietario_id y contratos.*_id.
 * `persona_id` apunta a personas.id (datos básicos compartidos).
 */
export interface Propietario extends PersonaBase {
  persona_id: string;
  banco: string;
  cbu: string;
  alias_cbu: string;
  condicion_iva: string;
  observaciones_fiscales: string;
  roles: RolPersona[];
}

export interface Inquilino extends PersonaBase {
  persona_id: string;
  garante_nombre: string;
  garante_telefono: string;
  garante_dni: string;
  ocupacion: string;
  ingresos_declarados: number;
  observaciones_inquilino: string;
  // Compat: algunos lugares leen .garante / .garante_telefono
  garante: string;
  roles: RolPersona[];
}

/** Alias retro-compatible: muchas pantallas tipan como Persona. */
export type Persona = Propietario | Inquilino;

export interface Propiedad {
  id: string;
  direccion: string;
  unidad: string;
  tipo: string;
  propietario_id: string | null; // -> propietarios.id
  estado: string;
  contrato_activo_id: string | null;
  metros: number;
  ambientes: number;
  observaciones: string;
  latitud?: number | null;
  longitud?: number | null;
  matricula_catastral?: string | null;
}

export interface Contrato {
  id: string;
  codigo: string;
  propiedad_id: string | null;
  propietario_id: string | null; // -> propietarios.id
  inquilino_id: string | null;   // -> inquilinos.id
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

// ─── Personas + roles (mappers compartidos) ────────────────

function mapPersonaBase(p: any): PersonaBase {
  return {
    id: p.id,
    nombre: p.nombre ?? '',
    dni: p.dni ?? '',
    cuit: p.cuit ?? '',
    email: p.email ?? '',
    telefono: p.telefono ?? '',
    direccion: p.direccion ?? '',
    observaciones: p.observaciones ?? '',
  };
}

async function fetchRolesPersona(personaId: string): Promise<RolPersona[]> {
  const { data, error } = await supabase
    .from('personas_roles')
    .select('rol')
    .eq('persona_id', personaId);
  if (error) throw error;
  return (data ?? []).map((r: any) => r.rol as RolPersona);
}

// ─── Propietarios ──────────────────────────────────────────

async function fetchPropietarios(): Promise<Propietario[]> {
  const { data, error } = await (supabase as any)
    .from('propietarios')
    .select('*, personas:persona_id(*, personas_roles(rol))');
  if (error) throw error;
  return (data ?? []).map((row: any): Propietario => {
    const base = mapPersonaBase(row.personas ?? {});
    return {
      ...base,
      id: row.id,
      persona_id: row.persona_id,
      banco: row.banco ?? '',
      cbu: row.cbu ?? '',
      alias_cbu: row.alias_cbu ?? '',
      condicion_iva: row.condicion_iva ?? '',
      observaciones_fiscales: row.observaciones_fiscales ?? '',
      roles: ((row.personas?.personas_roles ?? []) as any[]).map(r => r.rol as RolPersona),
    };
  }).sort((a: Propietario, b: Propietario) => a.nombre.localeCompare(b.nombre));
}

async function fetchPropietarioById(id: string): Promise<Propietario | null> {
  const { data, error } = await (supabase as any)
    .from('propietarios')
    .select('*, personas:persona_id(*, personas_roles(rol))')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const base = mapPersonaBase(data.personas ?? {});
  return {
    ...base,
    id: data.id,
    persona_id: data.persona_id,
    banco: data.banco ?? '',
    cbu: data.cbu ?? '',
    alias_cbu: data.alias_cbu ?? '',
    condicion_iva: data.condicion_iva ?? '',
    observaciones_fiscales: data.observaciones_fiscales ?? '',
    roles: ((data.personas?.personas_roles ?? []) as any[]).map(r => r.rol as RolPersona),
  };
}

export function usePropietarios() {
  return useQuery({ queryKey: ['propietarios'], queryFn: fetchPropietarios });
}

export function usePropietario(id: string) {
  return useQuery({
    queryKey: ['propietarios', id],
    queryFn: () => fetchPropietarioById(id),
    enabled: !!id,
  });
}

// ─── Inquilinos ────────────────────────────────────────────

async function fetchInquilinos(): Promise<Inquilino[]> {
  const { data, error } = await (supabase as any)
    .from('inquilinos')
    .select('*, personas:persona_id(*, personas_roles(rol))');
  if (error) throw error;
  return (data ?? []).map((row: any): Inquilino => {
    const base = mapPersonaBase(row.personas ?? {});
    return {
      ...base,
      id: row.id,
      persona_id: row.persona_id,
      garante_nombre: row.garante_nombre ?? '',
      garante_telefono: row.garante_telefono ?? '',
      garante_dni: row.garante_dni ?? '',
      ocupacion: row.ocupacion ?? '',
      ingresos_declarados: Number(row.ingresos_declarados ?? 0),
      observaciones_inquilino: row.observaciones_inquilino ?? '',
      garante: row.garante_nombre ?? '',
      roles: ((row.personas?.personas_roles ?? []) as any[]).map(r => r.rol as RolPersona),
    };
  }).sort((a: Inquilino, b: Inquilino) => a.nombre.localeCompare(b.nombre));
}

async function fetchInquilinoById(id: string): Promise<Inquilino | null> {
  const { data, error } = await (supabase as any)
    .from('inquilinos')
    .select('*, personas:persona_id(*, personas_roles(rol))')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const base = mapPersonaBase(data.personas ?? {});
  return {
    ...base,
    id: data.id,
    persona_id: data.persona_id,
    garante_nombre: data.garante_nombre ?? '',
    garante_telefono: data.garante_telefono ?? '',
    garante_dni: data.garante_dni ?? '',
    ocupacion: data.ocupacion ?? '',
    ingresos_declarados: Number(data.ingresos_declarados ?? 0),
    observaciones_inquilino: data.observaciones_inquilino ?? '',
    garante: data.garante_nombre ?? '',
    roles: ((data.personas?.personas_roles ?? []) as any[]).map(r => r.rol as RolPersona),
  };
}

export function useInquilinos() {
  return useQuery({ queryKey: ['inquilinos'], queryFn: fetchInquilinos });
}

export function useInquilino(id: string) {
  return useQuery({
    queryKey: ['inquilinos', id],
    queryFn: () => fetchInquilinoById(id),
    enabled: !!id,
  });
}

// Compat genérico — algunas pantallas usan un único hook por id de persona.
export function usePersona(id: string) {
  return useQuery({
    queryKey: ['personas', 'one', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('personas')
        .select('*, personas_roles(rol)')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const p: any = data;
      return {
        ...mapPersonaBase(p),
        roles: (p.personas_roles ?? []).map((r: any) => r.rol as RolPersona),
      };
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

export function findById<T extends { id: string }>(arr: T[] | undefined, id: string | null): T | undefined {
  if (!arr || !id) return undefined;
  return arr.find(item => item.id === id);
}

export const evolucionMensual = [
  { mes: 'Oct 2024', cobrado: 1850000, pendiente: 120000, comision: 185000 },
  { mes: 'Nov 2024', cobrado: 1920000, pendiente: 95000, comision: 192000 },
  { mes: 'Dic 2024', cobrado: 2100000, pendiente: 180000, comision: 210000 },
  { mes: 'Ene 2025', cobrado: 2250000, pendiente: 150000, comision: 225000 },
  { mes: 'Feb 2025', cobrado: 2350000, pendiente: 80000, comision: 235000 },
  { mes: 'Mar 2025', cobrado: 2316200, pendiente: 563500, comision: 230200 },
];
