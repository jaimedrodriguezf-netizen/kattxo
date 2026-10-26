import { SriVoucher, VoucherCategory } from './types';
import { isValidClaveAcceso, parseCurrencyAmount } from './validators';

/**
 * Descompone una clave de acceso de 49 dígitos numéricos en sus metadatos básicos.
 */
function extractIntrinsicMetadata(key: string): {
  tipoComprobante: string;
  rucEmisor: string;
  numeroComprobante: string;
  fechaEmision: string;
} {
  const cleanKey = key.trim();
  const day = cleanKey.substring(0, 2);
  const month = cleanKey.substring(2, 4);
  const year = cleanKey.substring(4, 8);
  const fechaEmision = `${day}/${month}/${year}`;
  const tipoComprobante = cleanKey.substring(8, 10);
  const rucEmisor = cleanKey.substring(10, 23);
  const estab = cleanKey.substring(24, 27);
  const ptoEmi = cleanKey.substring(27, 30);
  const secuencial = cleanKey.substring(30, 39);
  const numeroComprobante = `${estab}-${ptoEmi}-${secuencial}`;

  return { tipoComprobante, rucEmisor, numeroComprobante, fechaEmision };
}

/**
 * Parsea el contenido de un reporte TXT oficial emitido por el SRI (Ecuador)
 * tanto para Comprobantes Recibidos como Emitidos.
 * 
 * Tolera:
 * - Archivos delimitados por tabulador (\t) o punto y coma (;)
 * - Encabezados en primera fila
 * - Variaciones de orden de columnas
 * - Líneas con saltos \r\n o \n
 * - Prefijo BOM UTF-8 (\uFEFF)
 */
export function parseSriTxtReport(
  rawContent: string,
  defaultCategory?: VoucherCategory
): SriVoucher[] {
  if (!rawContent || typeof rawContent !== 'string') {
    return [];
  }

  // 1. Eliminar BOM UTF-8 y dividir en líneas
  const cleanContent = rawContent.replace(/^\uFEFF/, '').trim();
  if (!cleanContent) {
    return [];
  }

  const lines = cleanContent.split(/\r?\n/);
  const vouchersMap = new Map<string, SriVoucher>();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Buscar clave de acceso de 49 dígitos en la línea
    const claveMatch = line.match(/(?<!\d)\d{49}(?!\d)/);
    if (!claveMatch) {
      // Línea de encabezado o metadata sin clave de acceso
      continue;
    }

    const claveAcceso = claveMatch[0];
    if (!isValidClaveAcceso(claveAcceso)) {
      continue;
    }

    // Metadatos intrínsecos de la clave
    const intrinsic = extractIntrinsicMetadata(claveAcceso);

    // Detectar delimitador de columnas en la línea
    const delimiter = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ',';
    const cells = line.split(delimiter).map((c) => c.trim());

    let razonSocialEmisor = '';
    let totalImporte: number | undefined;
    let estado = 'AUTORIZADO';
    let fechaEmision = intrinsic.fechaEmision;
    let fechaAutorizacion: string | undefined;

    // Si la línea tiene columnas tabuladas estructuradas
    if (cells.length > 3) {
      // 1. Razón Social: usualmente columna 1 o celda adyacente al RUC
      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        if (cell === intrinsic.rucEmisor && i + 1 < cells.length) {
          const nextCell = cells[i + 1];
          if (nextCell && !nextCell.match(/^\d+$/) && nextCell.length > 2) {
            razonSocialEmisor = nextCell;
            break;
          }
        }
      }
      if (!razonSocialEmisor && cells[1] && isNaN(Number(cells[1]))) {
        razonSocialEmisor = cells[1];
      }

      // 2. Estado: buscar palabras clave típicas (AUTORIZADO, ANULADO, PENDIENTE)
      for (const cell of cells) {
        const upper = cell.toUpperCase();
        if (upper === 'AUTORIZADO' || upper === 'ANULADO' || upper === 'NO AUTORIZADO' || upper === 'CANCELADO') {
          estado = upper;
          break;
        }
      }

      // 3. Fechas en formato DD/MM/YYYY
      const dateMatches = line.match(/\b\d{2}\/\d{2}\/\d{4}(?:\s+\d{2}:\d{2}(?::\d{2})?)?\b/g);
      if (dateMatches && dateMatches.length > 0) {
        fechaEmision = dateMatches[0].split(' ')[0];
        if (dateMatches.length > 1) {
          fechaAutorizacion = dateMatches[1];
        }
      }

      // 4. Importe Total: buscar valores numéricos con decimales al final de la línea
      // En los TXT del SRI las últimas columnas suelen ser Subtotal, IVA, Total
      const numericCandidates: number[] = [];
      for (let i = cells.length - 1; i >= 0; i--) {
        const cell = cells[i];
        // Asegurar que la celda tiene formato numérico monetario, no es la clave de 49 dígitos ni un RUC/secuencial
        if (
          cell !== claveAcceso &&
          cell.length < 13 &&
          /^\$?\s*\d[\d.,]*$/.test(cell) &&
          !/^\d{3}-\d{3}-\d{9}$/.test(cell)
        ) {
          const amt = parseCurrencyAmount(cell);
          if (amt !== undefined && amt >= 0) {
            numericCandidates.push(amt);
            if (numericCandidates.length >= 3) break;
          }
        }
      }

      if (numericCandidates.length > 0) {
        // En reportes SRI, el total general con impuestos suele ser el mayor de los importes finales
        totalImporte = Math.max(...numericCandidates);
      }
    }

    if (!vouchersMap.has(claveAcceso)) {
      vouchersMap.set(claveAcceso, {
        claveAcceso,
        rucEmisor: intrinsic.rucEmisor,
        razonSocialEmisor,
        numeroComprobante: intrinsic.numeroComprobante,
        fechaEmision,
        fechaAutorizacion,
        tipoComprobante: intrinsic.tipoComprobante,
        estado,
        categoria: defaultCategory,
        totalImporte,
      });
    }
  }

  return Array.from(vouchersMap.values());
}
