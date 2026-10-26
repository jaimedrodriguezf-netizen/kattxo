/**
 * Sanitiza una porción de nombre de archivo para ser compatible con cualquier
 * sistema de archivos (Windows NTFS/FAT32, Linux ext4, macOS APFS).
 * Elimina caracteres reservados: \ / : * ? " < > | y caracteres de control.
 */
export function sanitizeFilenamePart(part: string | undefined | null): string {
  if (!part) return '';
  return part
    .replace(/[\\/:*?"<>|\r\n\t]+/g, '_') // Reemplazar caracteres ilegales por guión bajo
    .replace(/\s*_\s*/g, '_')            // Eliminar espacios alrededor de guiones
    .replace(/_{2,}/g, '_')              // Reducir guiones bajos repetidos
    .replace(/^_+|_+$/g, '')             // Eliminar guiones al inicio y fin
    .trim();
}

export interface VoucherFilenameData {
  tipo: string;
  tipoCode: string;
  clave: string;
  ruc: string;
  numero: string;
  secuencial: string;
  fecha: string;
  razonSocial?: string;
}

/**
 * Aplica una plantilla de nomenclatura personalizada con tokens dinámicos:
 * - {tipo}: Tipo en minúsculas (ej: factura, retencion)
 * - {tipoCode}: Código SRI (ej: 01, 07)
 * - {clave}: Clave de acceso de 49 dígitos
 * - {ruc}: RUC del emisor (13 dígitos)
 * - {numero}: Número de comprobante completo (ej: 001-001-000000123)
 * - {secuencial}: Secuencial numérico (ej: 000000123)
 * - {fecha}: Fecha de emisión (ej: 2024-05-14 o 14-05-2024)
 * - {razonSocial}: Razón social sanitizada
 * 
 * Si pattern no se especifica o está vacío, usa el predeterminado: '{tipo}_{clave}'.
 */
export function formatCustomFilename(
  pattern: string | undefined | null,
  data: VoucherFilenameData
): string {
  const effectivePattern = pattern && pattern.trim() ? pattern.trim() : '{tipo}_{clave}';

  const cleanRazonSocial = sanitizeFilenamePart(data.razonSocial || '');
  const cleanTipo = sanitizeFilenamePart(data.tipo);
  const cleanNumero = sanitizeFilenamePart(data.numero);
  const cleanFecha = sanitizeFilenamePart(data.fecha);

  const formatted = effectivePattern
    .replace(/{tipo}/gi, cleanTipo)
    .replace(/{tipoCode}/gi, data.tipoCode || '')
    .replace(/{clave}/gi, data.clave || '')
    .replace(/{ruc}/gi, data.ruc || '')
    .replace(/{numero}/gi, cleanNumero)
    .replace(/{secuencial}/gi, data.secuencial || '')
    .replace(/{fecha}/gi, cleanFecha)
    .replace(/{razonSocial}/gi, cleanRazonSocial);

  return sanitizeFilenamePart(formatted);
}
