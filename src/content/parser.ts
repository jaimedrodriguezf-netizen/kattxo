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
 * Busca todas las claves de acceso de 49 dígitos presentes en un texto o HTML.
 * Utiliza lookaround para no requerir límites de palabra \b (clave para cuando el texto
 * se concatena sin espacios con palabras como AUTORIZADO en RichFaces / JSF).
 */
export function findClavesInText(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/(?<!\d)\d{49}(?!\d)/g);
  return matches ? Array.from(new Set(matches)) : [];
}

/**
 * Extrae comprobantes de retención presentes en el DOM del SRI en Línea.
 * Robusto ante RichFaces, PrimeFaces, tablas JSF y enlaces mojarra.jsfcljs.
 */
export function extractRetentionsFromDom(doc: Document = document): RetentionVoucher[] {
  const vouchersMap = new Map<string, RetentionVoucher>();

  // 1. Estrategia Tablas (PrimeFaces / RichFaces / Estándar HTML)
  const rows = doc.querySelectorAll('table tbody tr, table tr');
  rows.forEach((row) => {
    const cells = Array.from(row.querySelectorAll('td'));
    const cellsText = cells.map((c) => (c as HTMLElement).innerText || c.textContent || '').join(' ');
    const rowText = (row as HTMLElement).innerText || row.textContent || '';
    const combinedText = `${cellsText} ${rowText}`;
    const keysInRow = findClavesInText(combinedText);

    // Buscar enlace específico de descarga XML (ej. Mojarra id="...:lnkXml")
    let xmlLinkId: string | undefined;
    const links = row.querySelectorAll('a, button');
    links.forEach((link) => {
      const id = link.getAttribute('id') || '';
      const href = link.getAttribute('href') || '';
      const onclick = link.getAttribute('onclick') || '';
      const title = link.getAttribute('title') || '';
      const hasXmlImg = !!link.querySelector('img[src*="xml" i]');

      if (
        id.includes('lnkXml') ||
        id.toLowerCase().includes('xml') ||
        onclick.includes('lnkXml') ||
        onclick.toLowerCase().includes('xml') ||
        title.toLowerCase().includes('xml') ||
        hasXmlImg
      ) {
        xmlLinkId = id;
      }

      const dataAttr = link.getAttribute('data-clave') || link.getAttribute('data-id') || '';
      const combinedAttrs = `${href} ${onclick} ${dataAttr} ${id}`;
      const urlKeys = findClavesInText(combinedAttrs);
      keysInRow.push(...urlKeys);
    });

    const uniqueRowKeys = Array.from(new Set(keysInRow));

    uniqueRowKeys.forEach((key) => {
      const parsed = parseClaveAcceso(key);
      if (parsed && parsed.tipoComprobante === '07') {
        if (xmlLinkId) {
          parsed.elementId = xmlLinkId;
        }

        // Enriquecer razón social examinando celdas
        if (cells.length > 0) {
          for (const cell of cells) {
            const cellText = ((cell as HTMLElement).innerText || cell.textContent || '').trim();
            if (
              cellText.length > 4 &&
              !/^\d+$/.test(cellText) &&
              !/^\d{2}\/\d{2}\/\d{4}$/.test(cellText) &&
              !cellText.includes(key) &&
              !cellText.toLowerCase().includes('retención') &&
              !cellText.toLowerCase().includes('retencion') &&
              !cellText.toLowerCase().includes('autorizado')
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
  const allLinks = doc.querySelectorAll('a, button');
  allLinks.forEach((el) => {
    const id = el.getAttribute('id') || '';
    const href = el.getAttribute('href') || '';
    const onclick = el.getAttribute('onclick') || '';
    const dataClave = el.getAttribute('data-clave') || '';
    const keys = findClavesInText(`${href} ${onclick} ${dataClave} ${id}`);
    keys.forEach((key) => {
      if (!vouchersMap.has(key)) {
        const parsed = parseClaveAcceso(key);
        if (parsed && parsed.tipoComprobante === '07') {
          if (id) parsed.elementId = id;
          vouchersMap.set(key, parsed);
        }
      }
    });
  });

  // 3. Estrategia Barrido General del Body (innerText + textContent)
  const bodyEl = doc.body as HTMLElement | null;
  if (bodyEl) {
    const fullText = `${bodyEl.innerText || ''} ${bodyEl.textContent || ''}`;
    const generalKeys = findClavesInText(fullText);
    generalKeys.forEach((key) => {
      if (!vouchersMap.has(key)) {
        const parsed = parseClaveAcceso(key);
        if (parsed && parsed.tipoComprobante === '07') {
          vouchersMap.set(key, parsed);
        }
      }
    });
  }

  // 4. Asignar enlaces XML por índice si algún comprobante quedó sin elementId
  const allXmlActionLinks = Array.from(
    doc.querySelectorAll<HTMLElement>('a[id*="lnkXml"], button[id*="lnkXml"], a[onclick*="lnkXml"]')
  );
  if (allXmlActionLinks.length > 0) {
    const list = Array.from(vouchersMap.values());
    list.forEach((voucher, idx) => {
      if (!voucher.elementId && allXmlActionLinks[idx]) {
        voucher.elementId = allXmlActionLinks[idx].id;
      }
    });
  }

  // 5. Estrategia Iframes embebidos en el mismo dominio
  const iframes = doc.querySelectorAll('iframe');
  iframes.forEach((iframe) => {
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc && iframeDoc !== doc) {
        const iframeVouchers = extractRetentionsFromDom(iframeDoc);
        iframeVouchers.forEach((v) => {
          if (!vouchersMap.has(v.claveAcceso)) {
            vouchersMap.set(v.claveAcceso, v);
          }
        });
      }
    } catch {
      // Ignorar cross-origin
    }
  });

  return Array.from(vouchersMap.values());
}
