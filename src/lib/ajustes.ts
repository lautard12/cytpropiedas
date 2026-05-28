// Helpers puros para calcular ciclos de ajuste de alquiler.
// Reutilizables desde Bandeja, formulario y detalle.

const MESES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const FRECUENCIAS: Record<string, number> = {
  mensual: 1,
  bimestral: 2,
  trimestral: 3,
  cuatrimestral: 4,
  semestral: 6,
  anual: 12,
};

export function mesesPorFrecuencia(frecuencia?: string | null): number | null {
  if (!frecuencia) return null;
  const k = frecuencia.toLowerCase().trim();
  return FRECUENCIAS[k] ?? null;
}

/** Suma `n` meses a un periodo YYYY-MM y devuelve el nuevo YYYY-MM. */
export function addMeses(periodoYYYYMM: string, n: number): string {
  const [y, m] = periodoYYYYMM.split('-').map(Number);
  const d = new Date(y, (m - 1) + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function periodoLabel(periodoYYYYMM: string): string {
  const [y, m] = periodoYYYYMM.split('-').map(Number);
  return `${MESES_ES[m - 1]} ${y}`;
}

/** Meses entre la fecha base (date) y el primer día del período YYYY-MM. */
export function mesesEntre(base: string, periodoYYYYMM: string): number {
  const baseDate = new Date(base);
  const [y, m] = periodoYYYYMM.split('-').map(Number);
  return (y - baseDate.getFullYear()) * 12 + (m - 1 - baseDate.getMonth());
}

export type ContratoAjuste = {
  fecha_inicio: string;
  fecha_ajuste_override?: string | null;
  frecuencia_ajuste?: string | null;
  indice_ajuste?: string | null;
};

export type EstadoAjuste =
  | { tipo: 'ninguno' }
  | {
      tipo: 'aplicar' | 'preavisar';
      periodoAjuste: string;
      periodoAjusteLabel: string;
      frecuencia: string;
      mesesCiclo: number;
      fechaBase: string;
      indice?: string | null;
    };

/**
 * Devuelve el estado de ajuste de un contrato para un período YYYY-MM.
 * - `aplicar`: el período ES el mes de ajuste.
 * - `preavisar`: el mes siguiente es el mes de ajuste.
 * - `ninguno`: nada que avisar.
 */
export function getEstadoAjuste(
  contrato: ContratoAjuste,
  periodoYYYYMM: string,
): EstadoAjuste {
  const ciclo = mesesPorFrecuencia(contrato.frecuencia_ajuste);
  // Mensual o frecuencia inválida → no aplica como evento puntual.
  if (!ciclo || ciclo <= 1) return { tipo: 'ninguno' };

  const base = contrato.fecha_ajuste_override || contrato.fecha_inicio;
  if (!base) return { tipo: 'ninguno' };

  const mEste = mesesEntre(base, periodoYYYYMM);
  const mSig = mEste + 1;

  if (mEste > 0 && mEste % ciclo === 0) {
    return {
      tipo: 'aplicar',
      periodoAjuste: periodoYYYYMM,
      periodoAjusteLabel: periodoLabel(periodoYYYYMM),
      frecuencia: contrato.frecuencia_ajuste!,
      mesesCiclo: ciclo,
      fechaBase: base,
      indice: contrato.indice_ajuste,
    };
  }

  if (mSig > 0 && mSig % ciclo === 0) {
    const periodoAjuste = addMeses(periodoYYYYMM, 1);
    return {
      tipo: 'preavisar',
      periodoAjuste,
      periodoAjusteLabel: periodoLabel(periodoAjuste),
      frecuencia: contrato.frecuencia_ajuste!,
      mesesCiclo: ciclo,
      fechaBase: base,
      indice: contrato.indice_ajuste,
    };
  }

  return { tipo: 'ninguno' };
}
