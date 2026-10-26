import { SriVoucher } from './types';
import { sanitizeCsvCell } from './csvExporter';

export interface ReconciliationDiscrepancy {
  claveAcceso: string;
  expectedVoucher: SriVoucher;
  actualVoucher: SriVoucher;
  expectedAmount: number;
  actualAmount: number;
  difference: number;
}

export interface ReconciliationSummary {
  totalExpected: number;
  totalActual: number;
  totalMatched: number;
  totalMissing: number;
  totalOrphans: number;
  totalDiscrepancies: number;
  completionRatePercent: number;
  totalExpectedAmount: number;
  totalActualAmount: number;
  amountDifference: number;
}

export interface ReconciliationItem {
  claveAcceso: string;
  expected?: SriVoucher;
  actual?: SriVoucher;
  status: 'matched' | 'missing' | 'orphan' | 'amount_discrepancy';
  difference?: number;
}

export interface ReconciliationResult {
  summary: ReconciliationSummary;
  matched: SriVoucher[];
  missing: SriVoucher[];
  orphans: SriVoucher[];
  discrepancies: ReconciliationDiscrepancy[];
  allItems: ReconciliationItem[];
}

/**
 * Realiza la conciliación cruzada de comprobantes electrónicos entre un conjunto esperado
 * (ej. extraído de un reporte TXT oficial del SRI) y los comprobantes efectivamente descargados/procesados.
 * 
 * @param expectedVouchers Arreglo de comprobantes esperados (desde TXT o consulta previa).
 * @param actualVouchers Arreglo de comprobantes efectivamente descargados o procesados.
 * @param options Opciones de configuración (ej. tolerancia contable).
 */
export function reconcileVouchers(
  expectedVouchers: SriVoucher[],
  actualVouchers: SriVoucher[],
  options: { tolerance?: number } = {}
): ReconciliationResult {
  const tolerance = options.tolerance !== undefined ? options.tolerance : 0.005;

  const expectedMap = new Map<string, SriVoucher>();
  for (const v of expectedVouchers) {
    if (v.claveAcceso) {
      expectedMap.set(v.claveAcceso, v);
    }
  }

  const actualMap = new Map<string, SriVoucher>();
  for (const v of actualVouchers) {
    if (v.claveAcceso) {
      actualMap.set(v.claveAcceso, v);
    }
  }

  const matched: SriVoucher[] = [];
  const missing: SriVoucher[] = [];
  const orphans: SriVoucher[] = [];
  const discrepancies: ReconciliationDiscrepancy[] = [];
  const allItems: ReconciliationItem[] = [];

  let totalExpectedAmount = 0;
  let totalActualAmount = 0;

  // 1. Evaluar todos los esperados
  for (const [clave, exp] of expectedMap.entries()) {
    const expAmt = exp.totalImporte !== undefined ? exp.totalImporte : 0;
    totalExpectedAmount += expAmt;

    const act = actualMap.get(clave);
    if (!act) {
      // Faltante en las descargas
      missing.push(exp);
      allItems.push({
        claveAcceso: clave,
        expected: exp,
        status: 'missing',
      });
    } else {
      const actAmt = act.totalImporte !== undefined ? act.totalImporte : 0;
      totalActualAmount += actAmt;

      const diff = Math.abs(expAmt - actAmt);
      if (expAmt > 0 && actAmt > 0 && diff > tolerance) {
        // Discrepancia de importe
        discrepancies.push({
          claveAcceso: clave,
          expectedVoucher: exp,
          actualVoucher: act,
          expectedAmount: expAmt,
          actualAmount: actAmt,
          difference: expAmt - actAmt,
        });
        allItems.push({
          claveAcceso: clave,
          expected: exp,
          actual: act,
          status: 'amount_discrepancy',
          difference: expAmt - actAmt,
        });
      } else {
        // Coincidencia exacta
        matched.push(act);
        allItems.push({
          claveAcceso: clave,
          expected: exp,
          actual: act,
          status: 'matched',
        });
      }
    }
  }

  // 2. Evaluar huérfanos (presentes en descargas pero no en esperados)
  for (const [clave, act] of actualMap.entries()) {
    if (!expectedMap.has(clave)) {
      orphans.push(act);
      const actAmt = act.totalImporte !== undefined ? act.totalImporte : 0;
      totalActualAmount += actAmt;
      allItems.push({
        claveAcceso: clave,
        actual: act,
        status: 'orphan',
      });
    }
  }

  const totalExpected = expectedMap.size;
  const totalActual = actualMap.size;
  const totalMatched = matched.length;
  const completionRatePercent =
    totalExpected > 0 ? (totalMatched / totalExpected) * 100 : totalActual > 0 ? 100 : 0;
  const amountDifference = totalExpectedAmount - totalActualAmount;

  const summary: ReconciliationSummary = {
    totalExpected,
    totalActual,
    totalMatched,
    totalMissing: missing.length,
    totalOrphans: orphans.length,
    totalDiscrepancies: discrepancies.length,
    completionRatePercent,
    totalExpectedAmount,
    totalActualAmount,
    amountDifference,
  };

  return {
    summary,
    matched,
    missing,
    orphans,
    discrepancies,
    allItems,
  };
}

/**
 * Convierte el resultado de una conciliación en un string CSV detallado para auditoría contable.
 */
export function reconciliationToCsv(result: ReconciliationResult): string {
  const UTF8_BOM = '\uFEFF';
  const headers = [
    'Estado Conciliación',
    'Clave de Acceso',
    'Número Comprobante',
    'RUC Emisor',
    'Razón Social Emisor',
    'Fecha Emisión',
    'Importe Esperado',
    'Importe Descargado',
    'Diferencia',
  ];

  const lines: string[] = [headers.join(';')];

  for (const item of result.allItems) {
    const v = item.actual || item.expected;
    const expAmt = item.expected?.totalImporte !== undefined ? item.expected.totalImporte.toFixed(2) : '';
    const actAmt = item.actual?.totalImporte !== undefined ? item.actual.totalImporte.toFixed(2) : '';
    const diffStr = item.difference !== undefined ? item.difference.toFixed(2) : '';

    let statusLabel = 'COINCIDENTE';
    if (item.status === 'missing') statusLabel = 'FALTANTE';
    else if (item.status === 'orphan') statusLabel = 'HUÉRFANO';
    else if (item.status === 'amount_discrepancy') statusLabel = 'DISCREPANCIA IMPORTE';

    lines.push(
      [
        sanitizeCsvCell(statusLabel),
        sanitizeCsvCell(item.claveAcceso),
        sanitizeCsvCell(v?.numeroComprobante || ''),
        sanitizeCsvCell(v?.rucEmisor || ''),
        sanitizeCsvCell(v?.razonSocialEmisor || ''),
        sanitizeCsvCell(v?.fechaEmision || ''),
        sanitizeCsvCell(expAmt),
        sanitizeCsvCell(actAmt),
        sanitizeCsvCell(diffStr),
      ].join(';')
    );
  }

  return `${UTF8_BOM}${lines.join('\r\n')}\r\n`;
}
