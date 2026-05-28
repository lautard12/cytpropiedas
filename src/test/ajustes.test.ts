import { describe, it, expect } from 'vitest';
import { getEstadoAjuste, addMeses, mesesEntre, periodoLabel } from '@/lib/ajustes';

const ct = (overrides: Partial<Parameters<typeof getEstadoAjuste>[0]> = {}) => ({
  fecha_inicio: '2025-03-01',
  frecuencia_ajuste: 'Trimestral',
  indice_ajuste: 'ICL',
  ...overrides,
});

describe('addMeses', () => {
  it('suma cruzando año', () => expect(addMeses('2025-12', 1)).toBe('2026-01'));
  it('resta meses', () => expect(addMeses('2025-02', -3)).toBe('2024-11'));
});

describe('mesesEntre', () => {
  it('mismo mes', () => expect(mesesEntre('2025-03-01', '2025-03')).toBe(0));
  it('3 meses adelante', () => expect(mesesEntre('2025-03-01', '2025-06')).toBe(3));
});

describe('periodoLabel', () => {
  it('formatea', () => expect(periodoLabel('2025-06')).toBe('Junio 2025'));
});

describe('getEstadoAjuste — Trimestral desde marzo/25', () => {
  it('mayo → preavisar junio', () => {
    const r = getEstadoAjuste(ct(), '2025-05');
    expect(r.tipo).toBe('preavisar');
    if (r.tipo === 'preavisar') expect(r.periodoAjuste).toBe('2025-06');
  });
  it('junio → aplicar', () => {
    expect(getEstadoAjuste(ct(), '2025-06').tipo).toBe('aplicar');
  });
  it('julio → ninguno', () => {
    expect(getEstadoAjuste(ct(), '2025-07').tipo).toBe('ninguno');
  });
  it('septiembre → aplicar', () => {
    expect(getEstadoAjuste(ct(), '2025-09').tipo).toBe('aplicar');
  });
  it('mes de inicio (marzo) → ninguno', () => {
    expect(getEstadoAjuste(ct(), '2025-03').tipo).toBe('ninguno');
  });
});

describe('getEstadoAjuste — preaviso cruzando año', () => {
  it('diciembre → preavisar enero (anual desde ene/25)', () => {
    const r = getEstadoAjuste(ct({ fecha_inicio: '2025-01-01', frecuencia_ajuste: 'Anual' }), '2025-12');
    expect(r.tipo).toBe('preavisar');
    if (r.tipo === 'preavisar') expect(r.periodoAjuste).toBe('2026-01');
  });
});

describe('getEstadoAjuste — override', () => {
  it('respeta fecha_ajuste_override', () => {
    const r = getEstadoAjuste(
      ct({ fecha_inicio: '2025-03-01', fecha_ajuste_override: '2025-04-01' }),
      '2025-07',
    );
    expect(r.tipo).toBe('aplicar'); // 3 meses desde abr → julio
  });
});

describe('getEstadoAjuste — frecuencias inválidas', () => {
  it('Mensual → siempre ninguno', () => {
    expect(getEstadoAjuste(ct({ frecuencia_ajuste: 'Mensual' }), '2025-06').tipo).toBe('ninguno');
  });
  it('vacía → ninguno', () => {
    expect(getEstadoAjuste(ct({ frecuencia_ajuste: '' }), '2025-06').tipo).toBe('ninguno');
  });
});
