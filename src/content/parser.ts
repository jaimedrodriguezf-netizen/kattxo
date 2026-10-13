import { RetentionVoucher } from '../domain/types';
import { isValidClaveAcceso } from '../domain/validators';

/**
 * Descompone una clave de acceso de 49 dígitos del SRI en sus metadatos intrínsecos.
 */
export function parseClaveAcceso(key: string): RetentionVoucher | null {
  if (!isValidClaveAcceso(key)) {
    return null;
  }

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

  return {
    claveAcceso: cleanKey,
    tipoComprobante,
    rucEmisor,
    numeroComprobante,
    fechaEmision,
    razonSocialEmisor: '',
  };
}

/**
 * Busca todas las claves de acceso de 49 dígitos presentes en un texto.
 */
export function findClavesInText(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/\b\d{49}\b/g);
  return matches ? Array.from(new Set(matches)) : [];
}

/**
 * Extrae comprobantes de retención presentes en el DOM del SRI en Línea.
 * Prioriza filas de tablas para capturar razones sociales y números de comprobante.
 */
export function extractRetentionsFromDom(doc: Document = document): RetentionVoucher[] {
  const vouchersMap = new Map<string, RetentionVoucher>();

  // 1. Estrategia Tablas (PrimeFaces / JSF / Estándar HTML)
  const rows = doc.querySelectorAll('table tbody tr, table tr');
  rows.forEach((row) => {
    const rowText = row.textContent || '';
    const keysInRow = findClavesInText(rowText);

    // También buscar en atributos href o data de la fila
    const links = row.querySelectorAll('a, button');
    links.forEach((link) => {
      const href = link.getAttribute('href') || '';
      const onclick = link.getAttribute('onclick') || '';
      const combined = `${href} ${onclick}`;
      const urlKeys = findClavesInText(combined);
      keysInRow.push(...urlKeys);
    });

    const uniqueRowKeys = Array.from(new Set(keysInRow));

    uniqueRowKeys.forEach((key) => {
      const parsed = parseClaveAcceso(key);
      if (parsed && parsed.tipoComprobante === '07') {
        // Intentar enriquecer razón social examinando celdas de la fila
        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length > 0) {
          // Buscar una celda con texto que parezca razón social (no números puros ni fechas)
          for (const cell of cells) {
            const cellText = (cell.textContent || '').trim();
            if (
              cellText.length > 4 &&
              !/^\d+$/.test(cellText) &&
              !/^\d{2}\/\d{2}\/\d{4}$/.test(cellText) &&
              !cellText.includes(key) &&
              !cellText.toLowerCase().includes('retención') &&
              !cellText.toLowerCase().includes('retencion')
            ) {
              parsed.razonSocialEmisor = cellText;
              break;
            }
          }
        }

        vouchersMap.set(key, parsed);
      }
    });
  });

  // 2. Estrategia Enlaces sueltos (botones de descarga de XML fuera de tablas)
  const allLinks = doc.querySelectorAll('a[href], button[data-clave]');
  allLinks.forEach((el) => {
    const href = el.getAttribute('href') || '';
    const dataClave = el.getAttribute('data-clave') || '';
    const keys = findClavesInText(`${href} ${dataClave}`);
    keys.forEach((key) => {
      if (!vouchersMap.has(key)) {
        const parsed = parseClaveAcceso(key);
        if (parsed && parsed.tipoComprobante === '07') {
          vouchersMap.set(key, parsed);
        }
      }
    });
  });

  // 3. Fallback de barrido general si no se hallaron en tablas
  if (vouchersMap.size === 0) {
    const bodyText = doc.body ? doc.body.textContent || '' : '';
    const generalKeys = findClavesInText(bodyText);
    generalKeys.forEach((key) => {
      const parsed = parseClaveAcceso(key);
      if (parsed && parsed.tipoComprobante === '07') {
        vouchersMap.set(key, parsed);
      }
    });
  }

  return Array.from(vouchersMap.values());
}
