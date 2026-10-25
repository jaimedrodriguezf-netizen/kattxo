import { RetentionVoucher, SriVoucher, SriDownloadPathOptions } from './types';

export const SRI_DOCUMENT_TYPE_MAP: Record<string, string> = {
  '01': 'Factura',
  '03': 'Liquidacion_Compra',
  '04': 'Nota_Credito',
  '05': 'Nota_Debito',
  '06': 'Guia_Remision',
  '07': 'Retencion',
};

/**
 * Obtiene el nombre estandarizado del tipo de documento según la codificación del SRI.
 */
export function getSriDocumentTypeName(code: string): string {
  if (!code) return 'Comprobante';
  const cleanCode = code.trim();
  return SRI_DOCUMENT_TYPE_MAP[cleanCode] || 'Comprobante';
}

/**
 * Extrae año, mes y día a partir de los primeros 8 dígitos de la clave de acceso del SRI.
 * Estructura de la clave de 49 dígitos: DDMMYYYY...
 */
export function extractDatePartsFromClaveAcceso(clave: string): { day: string; month: string; year: string } {
  if (!clave || typeof clave !== 'string') {
    return { day: '00', month: '00', year: '0000' };
  }
  const clean = clave.trim();
  if (clean.length < 8) {
    return { day: '00', month: '00', year: '0000' };
  }
  const day = clean.substring(0, 2);
  const month = clean.substring(2, 4);
  const year = clean.substring(4, 8);
  return { day, month, year };
}

/**
 * Valida si un string cumple el formato de una Clave de Acceso del SRI (49 dígitos numéricos).
 */
export function isValidClaveAcceso(key: string): boolean {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  return /^\d{49}$/.test(trimmed);
}

/**
 * Valida si un string cumple el formato de un RUC ecuatoriano (13 dígitos numéricos).
 */
export function isValidRuc(ruc: string): boolean {
  if (!ruc || typeof ruc !== 'string') return false;
  return /^\d{13}$/.test(ruc.trim());
}

/**
 * Genera una ruta jerárquica organizada en disco para la descarga del comprobante,
 * separando por categoría contable (Recibidos vs Emitidos).
 * Estructura: [baseDirectory]/[Recibidos|Emitidos]/[taxpayerRuc]/[Año]/[Mes]/[Tipo]/[prefijo]_[numero]_[clave].[ext]
 */
export function buildSriDownloadPath(
  voucher: SriVoucher,
  options: SriDownloadPathOptions = {}
): string {
  const {
    baseDirectory = 'Kattxo',
    taxpayerRuc = voucher.rucEmisor || 'SRI',
    format = 'xml',
    category = voucher.categoria || 'recibidos',
  } = options;

  const dateParts = extractDatePartsFromClaveAcceso(voucher.claveAcceso);
  const typeName = getSriDocumentTypeName(voucher.tipoComprobante);
  const typePrefix = typeName.toLowerCase();
  const cleanKey = voucher.claveAcceso.trim();
  const numComp = voucher.numeroComprobante ? `${voucher.numeroComprobante}_` : '';
  const filename = `${typePrefix}_${numComp}${cleanKey}.${format}`;

  const cleanBase = baseDirectory.replace(/^\/+|\/+$/g, '');
  const categoryDir = category === 'emitidos' ? 'Emitidos' : 'Recibidos';
  const cleanRuc = taxpayerRuc.trim();

  return `${cleanBase}/${categoryDir}/${cleanRuc}/${dateParts.year}/${dateParts.month}/${typeName}/${filename}`;
}

/**
 * Genera el nombre de archivo seguro para almacenar el XML de una retención.
 * Ejemplo: "retencion_0101202407019000000000120010010000000011234567813.xml"
 */
export function buildXmlFilename(voucher: RetentionVoucher, subdirectory = 'Kattxo/Retenciones'): string {
  const cleanKey = voucher.claveAcceso.trim();
  const sub = subdirectory.replace(/^\/+|\/+$/g, '');
  return sub ? `${sub}/retencion_${cleanKey}.xml` : `retencion_${cleanKey}.xml`;
}

/**
 * Parsea un importe monetario expresado en formato ecuatoriano o estándar ($ 1,234.56 o 1234,56).
 */
export function parseCurrencyAmount(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : val;
  }

  const str = val.trim();
  if (!str) return 0;

  // Remover $, USD, espacios
  let clean = str.replace(/[$USD\s]/gi, '');
  if (!clean) return 0;

  // Si tiene coma y punto (ej: 1,250.50): la coma es separador de miles
  if (clean.includes(',') && clean.includes('.')) {
    clean = clean.replace(/,/g, '');
  } else if (clean.includes(',') && !clean.includes('.')) {
    // Si solo tiene coma (ej: 125,50), reemplazar coma por punto
    clean = clean.replace(',', '.');
  }

  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

/**
 * Valida si dos importes coinciden dentro de un umbral de tolerancia contable (por defecto 0.005 centavos).
 * Si alguno de los dos importes no está presente (es 0), retorna true para no bloquear comprobantes sin importe reportado en tabla.
 */
export function verifyVoucherAmountMatch(
  tableAmount: number | string,
  detailAmount: number | string,
  tolerance = 0.005
): boolean {
  const numA = parseCurrencyAmount(tableAmount);
  const numB = parseCurrencyAmount(detailAmount);

  if (numA === 0 || numB === 0) {
    return true;
  }

  return Math.abs(numA - numB) <= tolerance;
}

