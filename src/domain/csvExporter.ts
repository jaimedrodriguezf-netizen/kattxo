import { SriVoucher } from './types';
import { getSriDocumentTypeName } from './validators';

/**
 * Sanitiza una celda para formato CSV estándar (Excel en español con delimitador punto y coma).
 * Escapa comillas dobles duplicándolas (" -> "") y envuelve en comillas si contiene
 * delimitador (;), salto de línea (\n o \r) o comillas dobles (").
 */
export function sanitizeCsvCell(value: string | undefined | null): string {
  if (value === undefined || value === null) {
    return '';
  }
  const str = String(value);
  if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Convierte un arreglo de comprobantes SriVoucher en un string CSV compatible con Excel.
 * - Incluye BOM UTF-8 (\uFEFF) para correcta interpretación de tildes y caracteres especiales.
 * - Delimitador estándar para Excel en español: punto y coma (;).
 * - Columnas: Fecha Emisión;Tipo Comprobante;Nombre Tipo;RUC Emisor;Razón Social Emisor;Identificación Receptor;Razón Social Receptor;Número Comprobante;Clave de Acceso;Estado
 */
export function vouchersToCsv(vouchers: SriVoucher[]): string {
  const UTF8_BOM = '\uFEFF';
  const headers = [
    'Fecha Emisión',
    'Tipo Comprobante',
    'Nombre Tipo',
    'RUC Emisor',
    'Razón Social Emisor',
    'Identificación Receptor',
    'Razón Social Receptor',
    'Número Comprobante',
    'Total Importe',
    'Clave de Acceso',
    'Estado',
  ];

  const headerLine = headers.join(';');

  if (!vouchers || vouchers.length === 0) {
    return `${UTF8_BOM}${headerLine}\r\n`;
  }

  const rows = vouchers.map((v) => {
    return [
      sanitizeCsvCell(v.fechaEmision),
      sanitizeCsvCell(v.tipoComprobante),
      sanitizeCsvCell(getSriDocumentTypeName(v.tipoComprobante)),
      sanitizeCsvCell(v.rucEmisor),
      sanitizeCsvCell(v.razonSocialEmisor),
      sanitizeCsvCell(v.identificacionSujetoRetenido),
      sanitizeCsvCell(v.razonSocialReceptor),
      sanitizeCsvCell(v.numeroComprobante),
      sanitizeCsvCell(v.totalImporte !== undefined ? v.totalImporte.toFixed(2) : ''),
      sanitizeCsvCell(v.claveAcceso),
      sanitizeCsvCell(v.estado),
    ].join(';');
  });

  return `${UTF8_BOM}${headerLine}\r\n${rows.join('\r\n')}\r\n`;
}

/**
 * Genera la ruta y nombre de archivo para el reporte CSV en disco.
 * Si se especifica periodo (ej. '2024-05' o '2024/05'):
 *   Kattxo/[RUC]/[Año]/[Mes]/reporte_comprobantes_[RUC]_[periodo].csv
 * Si se especifica año únicamente (ej. '2024'):
 *   Kattxo/[RUC]/[Año]/reporte_comprobantes_[RUC]_[Año].csv
 * Sin periodo:
 *   Kattxo/[RUC]/reporte_comprobantes_[RUC].csv
 */
export function buildCsvFilename(taxpayerRuc: string, period?: string): string {
  const cleanRuc = (taxpayerRuc || 'SRI').trim() || 'SRI';

  if (!period || !period.trim()) {
    return `Kattxo/${cleanRuc}/reporte_comprobantes_${cleanRuc}.csv`;
  }

  const cleanPeriod = period.trim();

  // Coincidencia formato YYYY-MM o YYYY/MM
  const yearMonthMatch = cleanPeriod.match(/^(\d{4})[-/](\d{1,2})$/);
  if (yearMonthMatch) {
    const year = yearMonthMatch[1];
    const month = yearMonthMatch[2].padStart(2, '0');
    return `Kattxo/${cleanRuc}/${year}/${month}/reporte_comprobantes_${cleanRuc}_${year}-${month}.csv`;
  }

  // Coincidencia formato YYYY (solo año)
  const yearMatch = cleanPeriod.match(/^(\d{4})$/);
  if (yearMatch) {
    const year = yearMatch[1];
    return `Kattxo/${cleanRuc}/${year}/reporte_comprobantes_${cleanRuc}_${year}.csv`;
  }

  const safePeriod = cleanPeriod.replace(/[\\/]+/g, '_');
  return `Kattxo/${cleanRuc}/reporte_comprobantes_${cleanRuc}_${safePeriod}.csv`;
}
