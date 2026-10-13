import { RetentionVoucher } from './types';

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
 * Genera el nombre de archivo seguro para almacenar el XML de una retención.
 * Ejemplo: "retencion_0101202407019000000000120010010000000011234567813.xml"
 */
export function buildXmlFilename(voucher: RetentionVoucher, subdirectory = 'Kattxo/Retenciones'): string {
  const cleanKey = voucher.claveAcceso.trim();
  const sub = subdirectory.replace(/^\/+|\/+$/g, '');
  return sub ? `${sub}/retencion_${cleanKey}.xml` : `retencion_${cleanKey}.xml`;
}
