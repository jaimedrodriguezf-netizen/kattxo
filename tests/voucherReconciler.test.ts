import { describe, it, expect } from 'vitest';
import { reconcileVouchers, reconciliationToCsv } from '../src/domain/voucherReconciler';
import { SriVoucher } from '../src/domain/types';

describe('voucherReconciler', () => {
  const makeVoucher = (clave: string, total = 100): SriVoucher => ({
    claveAcceso: clave,
    rucEmisor: '0190000000001',
    razonSocialEmisor: 'EMPRESA TEST',
    numeroComprobante: '001-001-000000001',
    fechaEmision: '14/05/2024',
    tipoComprobante: '01',
    totalImporte: total,
  });

  const k1 = '1405202401019000000000120010010000000011234567811';
  const k2 = '1405202401019000000000120010010000000021234567812';
  const k3 = '1405202401019000000000120010010000000031234567813';
  const k4 = '1405202401019000000000120010010000000041234567814';

  it('identifica correctamente cuando todos los comprobantes coinciden (100% completitud)', () => {
    const expected = [makeVoucher(k1, 50), makeVoucher(k2, 120)];
    const actual = [makeVoucher(k1, 50), makeVoucher(k2, 120)];

    const result = reconcileVouchers(expected, actual);

    expect(result.summary.totalExpected).toBe(2);
    expect(result.summary.totalActual).toBe(2);
    expect(result.summary.totalMatched).toBe(2);
    expect(result.summary.totalMissing).toBe(0);
    expect(result.summary.totalOrphans).toBe(0);
    expect(result.summary.totalDiscrepancies).toBe(0);
    expect(result.summary.completionRatePercent).toBe(100);
    expect(result.summary.totalExpectedAmount).toBe(170);
    expect(result.summary.totalActualAmount).toBe(170);
    expect(result.summary.amountDifference).toBe(0);
    expect(result.missing).toHaveLength(0);
  });

  it('detecta comprobantes faltantes (missing) cuando el TXT tiene comprobantes no descargados', () => {
    const expected = [makeVoucher(k1), makeVoucher(k2), makeVoucher(k3)];
    const actual = [makeVoucher(k1)]; // k2 y k3 faltaron

    const result = reconcileVouchers(expected, actual);

    expect(result.summary.totalExpected).toBe(3);
    expect(result.summary.totalActual).toBe(1);
    expect(result.summary.totalMatched).toBe(1);
    expect(result.summary.totalMissing).toBe(2);
    expect(result.summary.completionRatePercent).toBeCloseTo(33.33, 1);
    expect(result.missing).toHaveLength(2);
    expect(result.missing.map((v) => v.claveAcceso)).toEqual([k2, k3]);
  });

  it('detecta comprobantes huérfanos (orphans) presentes en la descarga pero no en el TXT', () => {
    const expected = [makeVoucher(k1)];
    const actual = [makeVoucher(k1), makeVoucher(k4)]; // k4 no estaba en expected

    const result = reconcileVouchers(expected, actual);

    expect(result.summary.totalMatched).toBe(1);
    expect(result.summary.totalOrphans).toBe(1);
    expect(result.orphans).toHaveLength(1);
    expect(result.orphans[0].claveAcceso).toBe(k4);
  });

  it('detecta discrepancias de importes monetarios que superan la tolerancia contable', () => {
    const expected = [makeVoucher(k1, 100.0)];
    const actual = [makeVoucher(k1, 95.5)]; // Diferencia de 4.50

    const result = reconcileVouchers(expected, actual, { tolerance: 0.005 });

    expect(result.summary.totalDiscrepancies).toBe(1);
    expect(result.discrepancies).toHaveLength(1);
    expect(result.discrepancies[0].claveAcceso).toBe(k1);
    expect(result.discrepancies[0].expectedAmount).toBe(100.0);
    expect(result.discrepancies[0].actualAmount).toBe(95.5);
    expect(result.discrepancies[0].difference).toBeCloseTo(4.5, 2);
  });

  it('tolera diferencias infinitesimales de redondeo dentro de la tolerancia', () => {
    const expected = [makeVoucher(k1, 100.002)];
    const actual = [makeVoucher(k1, 100.0)];

    const result = reconcileVouchers(expected, actual, { tolerance: 0.005 });

    expect(result.summary.totalDiscrepancies).toBe(0);
    expect(result.summary.totalMatched).toBe(1);
  });

  it('genera reporte CSV estructurado con BOM UTF-8 y estados de conciliación', () => {
    const expected = [makeVoucher(k1, 100.0), makeVoucher(k2, 50.0)];
    const actual = [makeVoucher(k1, 100.0), makeVoucher(k3, 80.0)]; // k2 falta, k3 es huérfano

    const result = reconcileVouchers(expected, actual);
    const csv = reconciliationToCsv(result);

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Estado Conciliación;Clave de Acceso;Número Comprobante');
    expect(csv).toContain('COINCIDENTE');
    expect(csv).toContain('FALTANTE');
    expect(csv).toContain('HUÉRFANO');
    expect(csv).toContain(k1);
    expect(csv).toContain(k2);
    expect(csv).toContain(k3);
  });
});
