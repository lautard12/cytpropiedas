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
  tasa_mora_diaria?: number;
  dias_gracia_mora?: number;
  medios_pago_aceptados?: string[];
  destino_cobro?: string;
}

export interface ConsultaMora {
  id: string;
  liquidacion_id: string;
  contrato_id: string;
  fecha_consulta: string;
  monto_estimado: number;
  dias_atraso: number;
  estado: 'Pendiente' | 'Aprobada' | 'Rechazada';
  fecha_respuesta: string | null;
  observaciones: string;
  decidido_por: string | null;
  created_at: string;
}

export interface Rendicion {
  id: string;
  liquidacion_id: string;
  propietario_id: string | null;
  fecha_acreditacion: string;
  fecha_transferencia: string | null;
  monto_neto: number;
  comision_retenida: number;
  iva_retenido: number;
  medio: string;
  referencia: string;
  comprobante_url: string | null;
  observaciones: string;
  estado: string;
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
  genera_factura?: boolean;
  tipo_factura?: string | null;
  numero_factura?: string;
  iva_comision?: number;
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

// Roles de dominio derivados: una persona es "propietario" si tiene fila en propietarios,
// "inquilino" si tiene fila en inquilinos. Ya no existe tabla personas_roles.
async function fetchRolesPersona(personaId: string): Promise<RolPersona[]> {
  const [{ data: prop }, { data: inq }] = await Promise.all([
    supabase.from('propietarios').select('id').eq('persona_id', personaId).maybeSingle(),
    supabase.from('inquilinos').select('id').eq('persona_id', personaId).maybeSingle(),
  ]);
  const roles: RolPersona[] = [];
  if (prop) roles.push('propietario');
  if (inq) roles.push('inquilino');
  return roles;
}

// ─── Propietarios ──────────────────────────────────────────

async function fetchPropietarios(): Promise<Propietario[]> {
  const { data, error } = await (supabase as any)
    .from('propietarios')
    .select('*, personas:persona_id(*, inquilinos(id))');
  if (error) throw error;
  return (data ?? []).map((row: any): Propietario => {
    const base = mapPersonaBase(row.personas ?? {});
    const roles: RolPersona[] = ['propietario'];
    if (row.personas?.inquilinos?.length) roles.push('inquilino');
    return {
      ...base,
      id: row.id,
      persona_id: row.persona_id,
      banco: row.banco ?? '',
      cbu: row.cbu ?? '',
      alias_cbu: row.alias_cbu ?? '',
      condicion_iva: row.condicion_iva ?? '',
      observaciones_fiscales: row.observaciones_fiscales ?? '',
      roles,
    };
  }).sort((a: Propietario, b: Propietario) => a.nombre.localeCompare(b.nombre));
}

async function fetchPropietarioById(id: string): Promise<Propietario | null> {
  const { data, error } = await (supabase as any)
    .from('propietarios')
    .select('*, personas:persona_id(*, inquilinos(id))')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const base = mapPersonaBase(data.personas ?? {});
  const roles: RolPersona[] = ['propietario'];
  if (data.personas?.inquilinos?.length) roles.push('inquilino');
  return {
    ...base,
    id: data.id,
    persona_id: data.persona_id,
    banco: data.banco ?? '',
    cbu: data.cbu ?? '',
    alias_cbu: data.alias_cbu ?? '',
    condicion_iva: data.condicion_iva ?? '',
    observaciones_fiscales: data.observaciones_fiscales ?? '',
    roles,
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
    .select('*, personas:persona_id(*, propietarios(id))');
  if (error) throw error;
  return (data ?? []).map((row: any): Inquilino => {
    const base = mapPersonaBase(row.personas ?? {});
    const roles: RolPersona[] = ['inquilino'];
    if (row.personas?.propietarios?.length) roles.push('propietario');
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
      roles,
    };
  }).sort((a: Inquilino, b: Inquilino) => a.nombre.localeCompare(b.nombre));
}

async function fetchInquilinoById(id: string): Promise<Inquilino | null> {
  const { data, error } = await (supabase as any)
    .from('inquilinos')
    .select('*, personas:persona_id(*, propietarios(id))')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const base = mapPersonaBase(data.personas ?? {});
  const roles: RolPersona[] = ['inquilino'];
  if (data.personas?.propietarios?.length) roles.push('propietario');
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
    roles,
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

// ─── Personal del staff (usuarios del sistema) ────────────
// Usuarios con persona vinculada + legajo activo en `personal`.
export function usePersonalUsuarios() {
  return useQuery({
    queryKey: ['usuarios', 'personal'],
    queryFn: async () => {
      const { data: usuarios, error } = await (supabase as any)
        .from('usuarios')
        .select('id, email, nombre, activo, persona_id, personas:persona_id(*), user_roles(role)')
        .not('persona_id', 'is', null)
        .order('nombre');
      if (error) throw error;

      const personaIds = (usuarios ?? []).map((u: any) => u.persona_id).filter(Boolean);
      let legajosByPersona: Record<string, any> = {};
      if (personaIds.length) {
        const { data: legajos, error: legErr } = await (supabase as any)
          .from('personal')
          .select('id, persona_id, sucursal_id, fecha_alta, causa_alta, fecha_baja, causa_baja, activo, sucursales:sucursal_id(id, nombre)')
          .in('persona_id', personaIds)
          .order('fecha_alta', { ascending: false });
        if (legErr) throw legErr;
        for (const l of legajos ?? []) {
          // priorizamos legajo activo; si no, el más reciente (orden ya descendente)
          const prev = legajosByPersona[l.persona_id];
          if (!prev || (l.activo && !prev.activo)) legajosByPersona[l.persona_id] = l;
        }
      }

      return (usuarios ?? []).map((u: any) => {
        const l = legajosByPersona[u.persona_id];
        return {
          ...mapPersonaBase(u.personas ?? { id: u.persona_id, nombre: u.nombre }),
          user_id: u.id,
          email: u.personas?.email || u.email || '',
          activo: u.activo,
          roles: (u.user_roles ?? []).map((r: any) => r.role as string),
          legajo: l ? {
            id: l.id as string,
            sucursal_id: l.sucursal_id as string | null,
            sucursal_nombre: l.sucursales?.nombre as string | undefined,
            fecha_alta: l.fecha_alta as string,
            causa_alta: l.causa_alta as string,
            fecha_baja: l.fecha_baja as string | null,
            causa_baja: l.causa_baja as string | null,
            activo: l.activo as boolean,
          } : null,
        };
      });
    },
  });
}

// Compat genérico — algunas pantallas usan un único hook por id de persona.
// Roles derivados desde existencia en propietarios/inquilinos.
export function usePersona(id: string) {
  return useQuery({
    queryKey: ['personas', 'one', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('personas')
        .select('*, propietarios(id), inquilinos(id)')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const p: any = data;
      const roles: RolPersona[] = [];
      if (p.propietarios?.length) roles.push('propietario');
      if (p.inquilinos?.length) roles.push('inquilino');
      return {
        ...mapPersonaBase(p),
        roles,
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

export function useRendiciones() {
  return useQuery({
    queryKey: ['rendiciones_propietario'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('rendiciones_propietario')
        .select('*')
        .order('fecha_acreditacion', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Rendicion[];
    },
  });
}

export function useRendicionByLiquidacion(liquidacionId: string) {
  return useQuery({
    queryKey: ['rendiciones_propietario', 'liquidacion', liquidacionId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('rendiciones_propietario')
        .select('*')
        .eq('liquidacion_id', liquidacionId)
        .maybeSingle();
      if (error) throw error;
      return data as Rendicion | null;
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
      // Calcular último día real del mes (evita fechas inválidas como 2025-04-31)
      const [yStr, mStr] = (periodo || '').split('-');
      const y = Number(yStr);
      const m = Number(mStr);
      const lastDay = (y && m) ? new Date(y, m, 0).getDate() : 31;
      const desde = `${periodo}-01`;
      const hasta = `${periodo}-${String(lastDay).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('eventos_contrato')
        .select('*')
        .eq('contrato_id', contratoId)
        .or(`periodo.eq.${periodo},and(fecha.gte.${desde},fecha.lte.${hasta})`)
        .order('fecha', { ascending: true });
      if (error) throw error;
      return (data as EventoContrato[]).filter(e =>
        e.periodo === periodo || (e.fecha >= desde && e.fecha <= hasta)
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

export function usePlantillasContrato(tipo?: 'Vivienda' | 'Comercial' | 'Temporario') {
  return useQuery({
    queryKey: ['plantillas_contrato', tipo ?? 'all'],
    queryFn: async () => {
      let q = supabase.from('plantillas_contrato').select('*').eq('activa', true).order('nombre');
      if (tipo) q = q.eq('tipo', tipo);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCotizacionUSD() {
  return useQuery({
    queryKey: ['cotizacion_usd_latest'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cotizaciones_usd')
        .select('*')
        .order('fecha', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCotizacionesUSD() {
  return useQuery({
    queryKey: ['cotizaciones_usd'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cotizaciones_usd')
        .select('*')
        .order('fecha', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ─── Garantías, Rescisiones, Renovaciones ─────────────────

export type TipoGarantia = 'Propietaria' | 'Garante' | 'Seguro_Caucion' | 'Recibo_Sueldo' | 'Otro';
export type EstadoGarantia = 'Vigente' | 'Vencida' | 'Reemplazada' | 'Anulada';

export interface GarantiaContrato {
  id: string;
  contrato_id: string;
  tipo: TipoGarantia;
  descripcion: string;
  persona_id: string | null;
  monto_cobertura: number | null;
  aseguradora: string;
  numero_poliza: string;
  empleador: string;
  fecha_emision: string | null;
  fecha_vencimiento: string | null;
  documento_url: string | null;
  estado: EstadoGarantia;
  observaciones: string;
}

export function useGarantiasContrato(contratoId: string) {
  return useQuery({
    queryKey: ['garantias_contrato', contratoId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('garantias_contrato').select('*')
        .eq('contrato_id', contratoId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as GarantiaContrato[];
    },
    enabled: !!contratoId,
  });
}

export function useGarantiasPorVencer(dias = 60) {
  return useQuery({
    queryKey: ['garantias_por_vencer', dias],
    queryFn: async () => {
      const hoy = new Date();
      const limite = new Date(); limite.setDate(hoy.getDate() + dias);
      const { data, error } = await (supabase as any)
        .from('garantias_contrato').select('*, contratos:contrato_id(codigo)')
        .eq('estado', 'Vigente')
        .not('fecha_vencimiento', 'is', null)
        .lte('fecha_vencimiento', limite.toISOString().slice(0,10))
        .order('fecha_vencimiento', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRescisiones(contratoId?: string) {
  return useQuery({
    queryKey: ['rescisiones', contratoId ?? 'all'],
    queryFn: async () => {
      let q = (supabase as any).from('rescisiones').select('*').order('fecha_efectiva', { ascending: false });
      if (contratoId) q = q.eq('contrato_id', contratoId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRenovaciones(contratoId: string) {
  return useQuery({
    queryKey: ['renovaciones', contratoId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('renovaciones_contrato').select('*')
        .eq('contrato_id', contratoId)
        .order('fecha_consulta', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!contratoId,
  });
}

export function useContratosPorVencer(dias = 90) {
  return useQuery({
    queryKey: ['contratos_por_vencer', dias],
    queryFn: async () => {
      const hoy = new Date();
      const limite = new Date(); limite.setDate(hoy.getDate() + dias);
      const { data, error } = await supabase
        .from('contratos').select('*')
        .eq('estado', 'Activo' as any)
        .lte('fecha_fin', limite.toISOString().slice(0,10))
        .order('fecha_fin', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Contrato[];
    },
  });
}

// ─── Helpers ──────────────────────────────────────────────

export function formatCurrency(amount: number, moneda: 'ARS' | 'USD' = 'ARS'): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: moneda,
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

export function useConsultaMoraByLiquidacion(liquidacionId: string) {
  return useQuery({
    queryKey: ['consultas_mora', liquidacionId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('consultas_mora')
        .select('*')
        .eq('liquidacion_id', liquidacionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as ConsultaMora | null;
    },
    enabled: !!liquidacionId,
  });
}

export const evolucionMensual = [
  { mes: 'Oct 2024', cobrado: 1850000, pendiente: 120000, comision: 185000 },
  { mes: 'Nov 2024', cobrado: 1920000, pendiente: 95000, comision: 192000 },
  { mes: 'Dic 2024', cobrado: 2100000, pendiente: 180000, comision: 210000 },
  { mes: 'Ene 2025', cobrado: 2250000, pendiente: 150000, comision: 225000 },
  { mes: 'Feb 2025', cobrado: 2350000, pendiente: 80000, comision: 235000 },
  { mes: 'Mar 2025', cobrado: 2316200, pendiente: 563500, comision: 230200 },
];
