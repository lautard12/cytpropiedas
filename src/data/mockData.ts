// ============================================================
// Mock Data — Sistema de Administración Inmobiliaria
// Datos realistas de Rosario / Santa Fe, Argentina
// ============================================================

export interface Propietario {
  id: string;
  nombre: string;
  telefono: string;
  email: string;
  cuit: string;
  direccion: string;
  banco: string;
  cbu: string;
}

export interface Inquilino {
  id: string;
  nombre: string;
  telefono: string;
  email: string;
  dni: string;
  garante: string;
  garanteTelefono: string;
}

export interface Propiedad {
  id: string;
  direccion: string;
  unidad: string;
  tipo: 'Departamento' | 'Casa' | 'Local' | 'Oficina' | 'PH';
  propietarioId: string;
  estado: 'Ocupada' | 'Vacante' | 'En refacción';
  contratoActivoId: string | null;
  metros: number;
  ambientes: number;
  observaciones: string;
}

export type ResponsableConcepto = 'Inquilino' | 'Propietario' | '50%' | 'No aplica';

export interface ReglasContrato {
  comisionPorcentaje: number;
  iva: boolean;
  tgi: ResponsableConcepto;
  api: ResponsableConcepto;
  expensasOrdinarias: ResponsableConcepto;
  expensasExtraordinarias: ResponsableConcepto;
  seguro: ResponsableConcepto;
  servicios: ResponsableConcepto;
  observaciones: string;
}

export interface Contrato {
  id: string;
  codigo: string;
  propiedadId: string;
  propietarioId: string;
  inquilinoId: string;
  fechaInicio: string;
  fechaFin: string;
  estado: 'Activo' | 'Vencido' | 'Por vencer' | 'Rescindido';
  alquilerBase: number;
  tipoAjuste: string;
  frecuenciaAjuste: string;
  diaVencimiento: number;
  reglas: ReglasContrato;
}

export type EstadoLiquidacion = 'Borrador' | 'Pendiente' | 'Parcial' | 'Cobrada' | 'Transferida';

export interface ConceptoLiquidacion {
  concepto: string;
  monto: number;
  responsable: string;
  aplicaAlInquilino: boolean;
}

export interface Liquidacion {
  id: string;
  contratoId: string;
  periodo: string; // "2025-03"
  periodoLabel: string; // "Marzo 2025"
  fechaEmision: string;
  estado: EstadoLiquidacion;
  conceptos: ConceptoLiquidacion[];
  subtotal: number;
  totalCobrar: number;
  totalCobrado: number;
  pendiente: number;
  comisionInmobiliaria: number;
  netoPropietario: number;
  saldoAnterior: number;
  observaciones: string;
}

export interface Pago {
  id: string;
  liquidacionId: string;
  contratoId: string;
  fecha: string;
  monto: number;
  medioPago: 'Transferencia' | 'Efectivo' | 'Cheque' | 'Depósito';
  referencia: string;
  estado: 'Confirmado' | 'Pendiente' | 'Rechazado';
  observaciones: string;
}

// ─── PROPIETARIOS ─────────────────────────────────────────

export const propietarios: Propietario[] = [
  {
    id: 'prop-001',
    nombre: 'Carlos Alberto Fernández',
    telefono: '341 456-7890',
    email: 'cfernandez@email.com',
    cuit: '20-18456789-3',
    direccion: 'Bv. Oroño 1250, Rosario',
    banco: 'Banco Nación',
    cbu: '0110012345678901234567',
  },
  {
    id: 'prop-002',
    nombre: 'María Elena Gutiérrez',
    telefono: '341 567-8901',
    email: 'mgutierrez@email.com',
    cuit: '27-22345678-9',
    direccion: 'Córdoba 1890, Rosario',
    banco: 'Banco Galicia',
    cbu: '0070023456789012345678',
  },
  {
    id: 'prop-003',
    nombre: 'Roberto Martínez',
    telefono: '342 678-9012',
    email: 'rmartinez@email.com',
    cuit: '20-25678901-5',
    direccion: 'San Martín 2400, Santa Fe',
    banco: 'Banco Santander',
    cbu: '0720034567890123456789',
  },
  {
    id: 'prop-004',
    nombre: 'Susana Beatriz López',
    telefono: '341 789-0123',
    email: 'slopez@email.com',
    cuit: '27-30789012-1',
    direccion: 'Pellegrini 950, Rosario',
    banco: 'Banco Macro',
    cbu: '2850045678901234567890',
  },
];

// ─── INQUILINOS ───────────────────────────────────────────

export const inquilinos: Inquilino[] = [
  {
    id: 'inq-001',
    nombre: 'Martín Alejandro Ruiz',
    telefono: '341 234-5678',
    email: 'mruiz@email.com',
    dni: '35.456.789',
    garante: 'Jorge Ruiz',
    garanteTelefono: '341 345-6789',
  },
  {
    id: 'inq-002',
    nombre: 'Laura Cecilia Moreno',
    telefono: '341 345-6789',
    email: 'lmoreno@email.com',
    dni: '38.567.890',
    garante: 'Ana Moreno',
    garanteTelefono: '341 456-7891',
  },
  {
    id: 'inq-003',
    nombre: 'Diego Sebastián Torres',
    telefono: '342 456-7890',
    email: 'dtorres@email.com',
    dni: '32.678.901',
    garante: 'Pedro Torres',
    garanteTelefono: '342 567-8901',
  },
  {
    id: 'inq-004',
    nombre: 'Valentina Romero',
    telefono: '341 567-8902',
    email: 'vromero@email.com',
    dni: '40.789.012',
    garante: 'Lucía Romero',
    garanteTelefono: '341 678-9013',
  },
  {
    id: 'inq-005',
    nombre: 'Federico Aguirre',
    telefono: '341 678-9014',
    email: 'faguirre@email.com',
    dni: '36.890.123',
    garante: 'Raúl Aguirre',
    garanteTelefono: '341 789-0125',
  },
];

// ─── PROPIEDADES ──────────────────────────────────────────

export const propiedades: Propiedad[] = [
  {
    id: 'unit-001',
    direccion: 'Bv. Oroño 1450',
    unidad: '3°B',
    tipo: 'Departamento',
    propietarioId: 'prop-001',
    estado: 'Ocupada',
    contratoActivoId: 'ct-001',
    metros: 75,
    ambientes: 3,
    observaciones: 'Edificio con vigilancia 24hs',
  },
  {
    id: 'unit-002',
    direccion: 'Córdoba 2150',
    unidad: '1°A',
    tipo: 'Departamento',
    propietarioId: 'prop-002',
    estado: 'Ocupada',
    contratoActivoId: 'ct-002',
    metros: 55,
    ambientes: 2,
    observaciones: 'Zona céntrica, muy buena ubicación',
  },
  {
    id: 'unit-003',
    direccion: 'San Lorenzo 1800',
    unidad: 'PB Local 2',
    tipo: 'Local',
    propietarioId: 'prop-002',
    estado: 'Ocupada',
    contratoActivoId: 'ct-003',
    metros: 90,
    ambientes: 1,
    observaciones: 'Local comercial con vidriera a la calle',
  },
  {
    id: 'unit-004',
    direccion: 'Mendoza 3200',
    unidad: '5°C',
    tipo: 'Departamento',
    propietarioId: 'prop-003',
    estado: 'Ocupada',
    contratoActivoId: 'ct-004',
    metros: 65,
    ambientes: 2,
    observaciones: 'Vista al río, balcón terraza',
  },
  {
    id: 'unit-005',
    direccion: 'Entre Ríos 850',
    unidad: 'Casa',
    tipo: 'Casa',
    propietarioId: 'prop-004',
    estado: 'Ocupada',
    contratoActivoId: 'ct-005',
    metros: 120,
    ambientes: 4,
    observaciones: 'Casa con patio y garage',
  },
  {
    id: 'unit-006',
    direccion: 'Pellegrini 1600',
    unidad: '2°D',
    tipo: 'Departamento',
    propietarioId: 'prop-001',
    estado: 'Vacante',
    contratoActivoId: null,
    metros: 48,
    ambientes: 1,
    observaciones: 'Monoambiente amplio, ideal inversión',
  },
  {
    id: 'unit-007',
    direccion: 'San Martín 2800',
    unidad: 'Of. 301',
    tipo: 'Oficina',
    propietarioId: 'prop-003',
    estado: 'En refacción',
    contratoActivoId: null,
    metros: 40,
    ambientes: 2,
    observaciones: 'En refacción, disponible desde mayo 2025',
  },
];

// ─── CONTRATOS ────────────────────────────────────────────

export const contratos: Contrato[] = [
  {
    id: 'ct-001',
    codigo: 'CT-2024-001',
    propiedadId: 'unit-001',
    propietarioId: 'prop-001',
    inquilinoId: 'inq-001',
    fechaInicio: '2024-03-01',
    fechaFin: '2026-02-28',
    estado: 'Activo',
    alquilerBase: 450000,
    tipoAjuste: 'ICL (Índice Casa Propia)',
    frecuenciaAjuste: 'Trimestral',
    diaVencimiento: 10,
    reglas: {
      comisionPorcentaje: 10,
      iva: false,
      tgi: '50%',
      api: 'Inquilino',
      expensasOrdinarias: 'Inquilino',
      expensasExtraordinarias: 'Propietario',
      seguro: 'Inquilino',
      servicios: 'Inquilino',
      observaciones: 'Actualización trimestral por ICL. TGI compartida 50/50.',
    },
  },
  {
    id: 'ct-002',
    codigo: 'CT-2024-002',
    propiedadId: 'unit-002',
    propietarioId: 'prop-002',
    inquilinoId: 'inq-002',
    fechaInicio: '2024-06-01',
    fechaFin: '2026-05-31',
    estado: 'Activo',
    alquilerBase: 320000,
    tipoAjuste: 'IPC (INDEC)',
    frecuenciaAjuste: 'Semestral',
    diaVencimiento: 5,
    reglas: {
      comisionPorcentaje: 8,
      iva: true,
      tgi: 'Inquilino',
      api: 'Propietario',
      expensasOrdinarias: 'Inquilino',
      expensasExtraordinarias: 'Propietario',
      seguro: 'No aplica',
      servicios: 'Inquilino',
      observaciones: 'Contrato con IVA. API a cargo del propietario.',
    },
  },
  {
    id: 'ct-003',
    codigo: 'CT-2023-015',
    propiedadId: 'unit-003',
    propietarioId: 'prop-002',
    inquilinoId: 'inq-003',
    fechaInicio: '2023-09-01',
    fechaFin: '2025-08-31',
    estado: 'Por vencer',
    alquilerBase: 580000,
    tipoAjuste: 'ICL (Índice Casa Propia)',
    frecuenciaAjuste: 'Trimestral',
    diaVencimiento: 1,
    reglas: {
      comisionPorcentaje: 12,
      iva: true,
      tgi: 'Inquilino',
      api: 'Inquilino',
      expensasOrdinarias: 'No aplica',
      expensasExtraordinarias: 'No aplica',
      seguro: 'Inquilino',
      servicios: 'Inquilino',
      observaciones: 'Local comercial. Sin expensas. Seguro obligatorio a cargo del inquilino.',
    },
  },
  {
    id: 'ct-004',
    codigo: 'CT-2024-008',
    propiedadId: 'unit-004',
    propietarioId: 'prop-003',
    inquilinoId: 'inq-004',
    fechaInicio: '2024-01-15',
    fechaFin: '2025-07-14',
    estado: 'Por vencer',
    alquilerBase: 380000,
    tipoAjuste: 'IPC (INDEC)',
    frecuenciaAjuste: 'Trimestral',
    diaVencimiento: 15,
    reglas: {
      comisionPorcentaje: 10,
      iva: false,
      tgi: 'Inquilino',
      api: 'Inquilino',
      expensasOrdinarias: 'Inquilino',
      expensasExtraordinarias: '50%',
      seguro: 'No aplica',
      servicios: 'Inquilino',
      observaciones: 'Extraordinarias compartidas 50/50. Sin seguro.',
    },
  },
  {
    id: 'ct-005',
    codigo: 'CT-2024-012',
    propiedadId: 'unit-005',
    propietarioId: 'prop-004',
    inquilinoId: 'inq-005',
    fechaInicio: '2024-09-01',
    fechaFin: '2026-08-31',
    estado: 'Activo',
    alquilerBase: 520000,
    tipoAjuste: 'ICL (Índice Casa Propia)',
    frecuenciaAjuste: 'Trimestral',
    diaVencimiento: 10,
    reglas: {
      comisionPorcentaje: 10,
      iva: false,
      tgi: 'Propietario',
      api: 'Inquilino',
      expensasOrdinarias: 'No aplica',
      expensasExtraordinarias: 'No aplica',
      seguro: 'Propietario',
      servicios: 'Inquilino',
      observaciones: 'Casa sin expensas. TGI y seguro a cargo del propietario.',
    },
  },
];

// ─── LIQUIDACIONES ────────────────────────────────────────

export const liquidaciones: Liquidacion[] = [
  {
    id: 'liq-001',
    contratoId: 'ct-001',
    periodo: '2025-03',
    periodoLabel: 'Marzo 2025',
    fechaEmision: '2025-03-01',
    estado: 'Cobrada',
    conceptos: [
      { concepto: 'Alquiler', monto: 450000, responsable: 'Inquilino', aplicaAlInquilino: true },
      { concepto: 'Expensas ordinarias', monto: 45000, responsable: 'Inquilino', aplicaAlInquilino: true },
      { concepto: 'TGI (50%)', monto: 12500, responsable: '50%', aplicaAlInquilino: true },
      { concepto: 'API', monto: 8500, responsable: 'Inquilino', aplicaAlInquilino: true },
      { concepto: 'Seguro', monto: 15000, responsable: 'Inquilino', aplicaAlInquilino: true },
      { concepto: 'EPE', monto: 18000, responsable: 'Inquilino', aplicaAlInquilino: true },
      { concepto: 'Gas', monto: 6500, responsable: 'Inquilino', aplicaAlInquilino: true },
      { concepto: 'Aguas Santafesinas', monto: 4200, responsable: 'Inquilino', aplicaAlInquilino: true },
    ],
    subtotal: 559700,
    totalCobrar: 559700,
    totalCobrado: 559700,
    pendiente: 0,
    comisionInmobiliaria: 45000,
    netoPropietario: 514700,
    saldoAnterior: 0,
    observaciones: '',
  },
  {
    id: 'liq-002',
    contratoId: 'ct-002',
    periodo: '2025-03',
    periodoLabel: 'Marzo 2025',
    fechaEmision: '2025-03-01',
    estado: 'Pendiente',
    conceptos: [
      { concepto: 'Alquiler', monto: 320000, responsable: 'Inquilino', aplicaAlInquilino: true },
      { concepto: 'Expensas ordinarias', monto: 38000, responsable: 'Inquilino', aplicaAlInquilino: true },
      { concepto: 'TGI', monto: 22000, responsable: 'Inquilino', aplicaAlInquilino: true },
      { concepto: 'IVA (21%)', monto: 67200, responsable: 'Inquilino', aplicaAlInquilino: true },
      { concepto: 'EPE', monto: 14000, responsable: 'Inquilino', aplicaAlInquilino: true },
      { concepto: 'Gas', monto: 5800, responsable: 'Inquilino', aplicaAlInquilino: true },
    ],
    subtotal: 467000,
    totalCobrar: 467000,
    totalCobrado: 0,
    pendiente: 467000,
    comisionInmobiliaria: 25600,
    netoPropietario: 441400,
    saldoAnterior: 0,
    observaciones: 'Vencimiento: 05/03/2025',
  },
  {
    id: 'liq-003',
    contratoId: 'ct-003',
    periodo: '2025-03',
    periodoLabel: 'Marzo 2025',
    fechaEmision: '2025-03-01',
    estado: 'Cobrada',
    conceptos: [
      { concepto: 'Alquiler', monto: 580000, responsable: 'Inquilino', aplicaAlInquilino: true },
      { concepto: 'TGI', monto: 35000, responsable: 'Inquilino', aplicaAlInquilino: true },
      { concepto: 'API', monto: 12000, responsable: 'Inquilino', aplicaAlInquilino: true },
      { concepto: 'Seguro', monto: 28000, responsable: 'Inquilino', aplicaAlInquilino: true },
      { concepto: 'IVA (21%)', monto: 121800, responsable: 'Inquilino', aplicaAlInquilino: true },
      { concepto: 'EPE', monto: 32000, responsable: 'Inquilino', aplicaAlInquilino: true },
    ],
    subtotal: 808800,
    totalCobrar: 808800,
    totalCobrado: 808800,
    pendiente: 0,
    comisionInmobiliaria: 69600,
    netoPropietario: 739200,
    saldoAnterior: 0,
    observaciones: '',
  },
  {
    id: 'liq-004',
    contratoId: 'ct-004',
    periodo: '2025-03',
    periodoLabel: 'Marzo 2025',
    fechaEmision: '2025-03-15',
    estado: 'Parcial',
    conceptos: [
      { concepto: 'Alquiler', monto: 380000, responsable: 'Inquilino', aplicaAlInquilino: true },
      { concepto: 'Expensas ordinarias', monto: 42000, responsable: 'Inquilino', aplicaAlInquilino: true },
      { concepto: 'TGI', monto: 18000, responsable: 'Inquilino', aplicaAlInquilino: true },
      { concepto: 'API', monto: 9500, responsable: 'Inquilino', aplicaAlInquilino: true },
      { concepto: 'EPE', monto: 16000, responsable: 'Inquilino', aplicaAlInquilino: true },
      { concepto: 'Gas', monto: 7200, responsable: 'Inquilino', aplicaAlInquilino: true },
      { concepto: 'Aguas Santafesinas', monto: 3800, responsable: 'Inquilino', aplicaAlInquilino: true },
    ],
    subtotal: 476500,
    totalCobrar: 476500,
    totalCobrado: 380000,
    pendiente: 96500,
    comisionInmobiliaria: 38000,
    netoPropietario: 438500,
    saldoAnterior: 0,
    observaciones: 'Pago parcial. Pendiente servicios.',
  },
  {
    id: 'liq-005',
    contratoId: 'ct-005',
    periodo: '2025-03',
    periodoLabel: 'Marzo 2025',
    fechaEmision: '2025-03-01',
    estado: 'Transferida',
    conceptos: [
      { concepto: 'Alquiler', monto: 520000, responsable: 'Inquilino', aplicaAlInquilino: true },
      { concepto: 'API', monto: 11000, responsable: 'Inquilino', aplicaAlInquilino: true },
      { concepto: 'EPE', monto: 22000, responsable: 'Inquilino', aplicaAlInquilino: true },
      { concepto: 'Gas', monto: 9500, responsable: 'Inquilino', aplicaAlInquilino: true },
      { concepto: 'Aguas Santafesinas', monto: 5200, responsable: 'Inquilino', aplicaAlInquilino: true },
    ],
    subtotal: 567700,
    totalCobrar: 567700,
    totalCobrado: 567700,
    pendiente: 0,
    comisionInmobiliaria: 52000,
    netoPropietario: 515700,
    saldoAnterior: 0,
    observaciones: 'Transferido el 20/03/2025',
  },
  // Febrero 2025
  {
    id: 'liq-006',
    contratoId: 'ct-001',
    periodo: '2025-02',
    periodoLabel: 'Febrero 2025',
    fechaEmision: '2025-02-01',
    estado: 'Transferida',
    conceptos: [
      { concepto: 'Alquiler', monto: 450000, responsable: 'Inquilino', aplicaAlInquilino: true },
      { concepto: 'Expensas ordinarias', monto: 43000, responsable: 'Inquilino', aplicaAlInquilino: true },
      { concepto: 'TGI (50%)', monto: 12500, responsable: '50%', aplicaAlInquilino: true },
      { concepto: 'API', monto: 8500, responsable: 'Inquilino', aplicaAlInquilino: true },
    ],
    subtotal: 514000,
    totalCobrar: 514000,
    totalCobrado: 514000,
    pendiente: 0,
    comisionInmobiliaria: 45000,
    netoPropietario: 469000,
    saldoAnterior: 0,
    observaciones: '',
  },
  {
    id: 'liq-007',
    contratoId: 'ct-002',
    periodo: '2025-02',
    periodoLabel: 'Febrero 2025',
    fechaEmision: '2025-02-01',
    estado: 'Cobrada',
    conceptos: [
      { concepto: 'Alquiler', monto: 320000, responsable: 'Inquilino', aplicaAlInquilino: true },
      { concepto: 'Expensas ordinarias', monto: 36000, responsable: 'Inquilino', aplicaAlInquilino: true },
      { concepto: 'TGI', monto: 22000, responsable: 'Inquilino', aplicaAlInquilino: true },
      { concepto: 'IVA (21%)', monto: 67200, responsable: 'Inquilino', aplicaAlInquilino: true },
    ],
    subtotal: 445200,
    totalCobrar: 445200,
    totalCobrado: 445200,
    pendiente: 0,
    comisionInmobiliaria: 25600,
    netoPropietario: 419600,
    saldoAnterior: 0,
    observaciones: '',
  },
];

// ─── PAGOS ────────────────────────────────────────────────

export const pagos: Pago[] = [
  {
    id: 'pago-001',
    liquidacionId: 'liq-001',
    contratoId: 'ct-001',
    fecha: '2025-03-08',
    monto: 559700,
    medioPago: 'Transferencia',
    referencia: 'TRF-20250308-001',
    estado: 'Confirmado',
    observaciones: 'Pago total del período',
  },
  {
    id: 'pago-002',
    liquidacionId: 'liq-003',
    contratoId: 'ct-003',
    fecha: '2025-03-01',
    monto: 808800,
    medioPago: 'Transferencia',
    referencia: 'TRF-20250301-003',
    estado: 'Confirmado',
    observaciones: 'Pago puntual',
  },
  {
    id: 'pago-003',
    liquidacionId: 'liq-004',
    contratoId: 'ct-004',
    fecha: '2025-03-16',
    monto: 380000,
    medioPago: 'Efectivo',
    referencia: 'REC-20250316-004',
    estado: 'Confirmado',
    observaciones: 'Pago parcial - solo alquiler',
  },
  {
    id: 'pago-004',
    liquidacionId: 'liq-005',
    contratoId: 'ct-005',
    fecha: '2025-03-09',
    monto: 567700,
    medioPago: 'Transferencia',
    referencia: 'TRF-20250309-005',
    estado: 'Confirmado',
    observaciones: '',
  },
  {
    id: 'pago-005',
    liquidacionId: 'liq-006',
    contratoId: 'ct-001',
    fecha: '2025-02-09',
    monto: 514000,
    medioPago: 'Transferencia',
    referencia: 'TRF-20250209-001',
    estado: 'Confirmado',
    observaciones: '',
  },
  {
    id: 'pago-006',
    liquidacionId: 'liq-007',
    contratoId: 'ct-002',
    fecha: '2025-02-05',
    monto: 445200,
    medioPago: 'Depósito',
    referencia: 'DEP-20250205-002',
    estado: 'Confirmado',
    observaciones: '',
  },
];

// ─── HELPERS ──────────────────────────────────────────────

export function getPropietario(id: string) {
  return propietarios.find(p => p.id === id);
}

export function getInquilino(id: string) {
  return inquilinos.find(i => i.id === id);
}

export function getPropiedad(id: string) {
  return propiedades.find(p => p.id === id);
}

export function getContrato(id: string) {
  return contratos.find(c => c.id === id);
}

export function getLiquidacion(id: string) {
  return liquidaciones.find(l => l.id === id);
}

export function getContratoByPropiedad(propiedadId: string) {
  return contratos.find(c => c.propiedadId === propiedadId && (c.estado === 'Activo' || c.estado === 'Por vencer'));
}

export function getLiquidacionesByContrato(contratoId: string) {
  return liquidaciones.filter(l => l.contratoId === contratoId);
}

export function getPagosByLiquidacion(liquidacionId: string) {
  return pagos.filter(p => p.liquidacionId === liquidacionId);
}

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

// ─── DASHBOARD AGGREGATES ─────────────────────────────────

export function getDashboardData() {
  const liqsMarzo = liquidaciones.filter(l => l.periodo === '2025-03');

  const totalCobrado = liqsMarzo.reduce((s, l) => s + l.totalCobrado, 0);
  const totalPendiente = liqsMarzo.reduce((s, l) => s + l.pendiente, 0);
  const totalComision = liqsMarzo.reduce((s, l) => s + l.comisionInmobiliaria, 0);
  const totalNetoPropietarios = liqsMarzo.reduce((s, l) => s + l.netoPropietario, 0);
  const contratosActivos = contratos.filter(c => c.estado === 'Activo' || c.estado === 'Por vencer').length;
  const inquilinosMora = liqsMarzo.filter(l => l.estado === 'Pendiente' || l.estado === 'Parcial').length;
  const pendienteTransferencia = liqsMarzo.filter(l => l.estado === 'Cobrada').reduce((s, l) => s + l.netoPropietario, 0);
  const gastosRetenidos = totalCobrado - totalNetoPropietarios - totalComision;

  return {
    totalCobrado,
    totalPendiente,
    totalComision,
    totalNetoPropietarios,
    contratosActivos,
    inquilinosMora,
    pendienteTransferencia,
    gastosRetenidos: gastosRetenidos > 0 ? gastosRetenidos : 0,
    saldoAdministracion: totalComision,
  };
}

// Monthly evolution data
export const evolucionMensual = [
  { mes: 'Oct 2024', cobrado: 1850000, pendiente: 120000, comision: 185000 },
  { mes: 'Nov 2024', cobrado: 1920000, pendiente: 95000, comision: 192000 },
  { mes: 'Dic 2024', cobrado: 2100000, pendiente: 180000, comision: 210000 },
  { mes: 'Ene 2025', cobrado: 2250000, pendiente: 150000, comision: 225000 },
  { mes: 'Feb 2025', cobrado: 2350000, pendiente: 80000, comision: 235000 },
  { mes: 'Mar 2025', cobrado: 2316200, pendiente: 563500, comision: 230200 },
];
