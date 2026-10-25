import { SriVoucher, RetentionVoucher, TaxpayerProfile, VoucherCategory } from '../domain/types';
import { isValidClaveAcceso, isValidRuc, parseCurrencyAmount } from '../domain/validators';

/**
 * Descompone una clave de acceso de 49 dígitos del SRI en sus metadatos intrínsecos.
 */
export function parseClaveAcceso(key: string): SriVoucher | null {
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
 * Extrae el perfil del contribuyente (RUC y Razón Social) del DOM del SRI en Línea.
 */
export function extractTaxpayerProfileFromDom(doc: Document = document): TaxpayerProfile | null {
  // 1. Selector específico de la página de perfil (/contribuyente/perfil)
  const nameEl = doc.querySelector('label.nombre-contribuyente, label.titulo-campo.nombre-contribuyente, [data-role="taxpayer-name"]');
  const rucEl = doc.querySelector('label.titulo-perfil, label.ruc-contribuyente, [data-role="taxpayer-ruc"]');

  if (nameEl && rucEl) {
    const rawRuc = (rucEl.textContent || '').trim();
    const rucMatch = rawRuc.match(/\d{13}/);
    if (rucMatch) {
      return {
        ruc: rucMatch[0],
        razonSocial: (nameEl.textContent || '').trim(),
      };
    }
  }

  // 2. Búsqueda en barras de navegación, headers o badges de usuario
  const candidateElements = doc.querySelectorAll(
    '.navbar-header, .user-info, .nombre-usuario, header, #sri-header, #panelPerfil'
  );

  for (const el of Array.from(candidateElements)) {
    const text = el.textContent || '';
    // Coincidencia tipo "RUC: 0190000000001 - NOMBRE EMPRESA" o similar
    const rucMatch = text.match(/RUC:?\s*(\d{13})(?:\s*-\s*([^<\n\r]+))?/i);
    if (rucMatch) {
      return {
        ruc: rucMatch[1],
        razonSocial: rucMatch[2] ? rucMatch[2].trim() : undefined,
      };
    }
  }

  // 3. Barrido general de texto con patrón RUC
  const bodyText = doc.body?.textContent || '';
  const genericMatch = bodyText.match(/RUC:?\s*(\d{13})(?:\s*-\s*([A-Z0-9\s.,-]+))?/i);
  if (genericMatch && isValidRuc(genericMatch[1])) {
    return {
      ruc: genericMatch[1],
      razonSocial: genericMatch[2] ? genericMatch[2].trim() : undefined,
    };
  }

  return null;
}

/**
 * Extrae comprobantes electrónicos de cualquier tipo presentes en el DOM del SRI en Línea.
 * Robusto ante RichFaces, PrimeFaces, tablas JSF y enlaces mojarra.jsfcljs.
 * 
 * @param doc Documento DOM a escanear.
 * @param filterType Código de tipo ('01', '07', etc.) o null/'ALL' para todos.
 */
export function extractVouchersFromDom(
  doc: Document = document,
  filterType?: string | null
): SriVoucher[] {
  const vouchersMap = new Map<string, SriVoucher>();

  // Detectar categoría general de la página o tabla
  const pageUrl = doc.location?.href || '';
  let defaultCategory: VoucherCategory = 'recibidos';
  if (pageUrl.includes('/emitidos/') || doc.body?.textContent?.toLowerCase().includes('comprobantes emitidos')) {
    defaultCategory = 'emitidos';
  }

  // 1. Estrategia Tablas (PrimeFaces / RichFaces / Estándar HTML)
  const tables = doc.querySelectorAll('table');
  tables.forEach((table) => {
    // Determinar categoría por encabezados de la tabla
    const headerText = (table.querySelector('thead')?.textContent || '').toLowerCase();
    const isEmitidosTable =
      headerText.includes('receptor') ||
      headerText.includes('cliente') ||
      defaultCategory === 'emitidos';
    const category: VoucherCategory = isEmitidosTable ? 'emitidos' : 'recibidos';

    const rows = table.querySelectorAll('tbody tr, tr');
    rows.forEach((row) => {
      const cells = Array.from(row.querySelectorAll('td'));
      const cellsText = cells.map((c) => (c as HTMLElement).innerText || c.textContent || '').join(' ');
      const rowText = (row as HTMLElement).innerText || row.textContent || '';
      const combinedText = `${cellsText} ${rowText}`;
      const keysInRow = findClavesInText(combinedText);

      // Buscar enlaces de XML y PDF/RIDE en la fila
      let xmlLinkId: string | undefined;
      let pdfLinkId: string | undefined;

      const links = row.querySelectorAll('a, button');
      links.forEach((link) => {
        const id = link.getAttribute('id') || '';
        const href = link.getAttribute('href') || '';
        const onclick = link.getAttribute('onclick') || '';
        const title = (link.getAttribute('title') || '').toLowerCase();
        const hasXmlImg = !!link.querySelector('img[src*="xml" i]');
        const hasPdfImg = !!link.querySelector('img[src*="pdf" i]');

        // Detección XML
        if (
          id.includes('lnkXml') ||
          id.toLowerCase().includes('xml') ||
          onclick.includes('lnkXml') ||
          onclick.toLowerCase().includes('xml') ||
          title.includes('xml') ||
          hasXmlImg
        ) {
          xmlLinkId = id;
        }

        // Detección PDF / RIDE
        if (
          id.includes('lnkPdf') ||
          id.includes('lnkRide') ||
          id.toLowerCase().includes('pdf') ||
          id.toLowerCase().includes('ride') ||
          onclick.includes('lnkPdf') ||
          onclick.includes('lnkRide') ||
          title.includes('pdf') ||
          title.includes('ride') ||
          hasPdfImg
        ) {
          pdfLinkId = id;
        }

        const dataAttr = link.getAttribute('data-clave') || link.getAttribute('data-id') || '';
        const combinedAttrs = `${href} ${onclick} ${dataAttr} ${id}`;
        const urlKeys = findClavesInText(combinedAttrs);
        keysInRow.push(...urlKeys);
      });

      const uniqueRowKeys = Array.from(new Set(keysInRow));

      uniqueRowKeys.forEach((key) => {
        const parsed = parseClaveAcceso(key);
        if (!parsed) return;

        // Filtrar por tipo si se solicitó uno específico
        if (filterType && filterType !== 'ALL' && parsed.tipoComprobante !== filterType) {
          return;
        }

        parsed.categoria = category;
        if (xmlLinkId) parsed.elementId = xmlLinkId;
        if (pdfLinkId) parsed.elementPdfId = pdfLinkId;

        // Enriquecer razón social / receptor examinando celdas de la fila
        if (cells.length > 0) {
          for (const cell of cells) {
            const cellText = ((cell as HTMLElement).innerText || cell.textContent || '').trim();

            // Detectar importe total de la fila (formato monetario e.g. $ 125.50 o 125.50)
            if (/^\$?\s*\d{1,7}(?:[.,]\d{3})*[.,]\d{2}$/.test(cellText)) {
              const parsedAmt = parseCurrencyAmount(cellText);
              if (parsedAmt > 0) {
                parsed.totalImporte = parsedAmt;
              }
            }

            if (
              cellText.length > 4 &&
              !/^\d+$/.test(cellText) &&
              !/^\d{2}\/\d{2}\/\d{4}$/.test(cellText) &&
              !/^\$?\s*\d/.test(cellText) &&
              !cellText.includes(key) &&
              !cellText.toLowerCase().includes('factura') &&
              !cellText.toLowerCase().includes('retención') &&
              !cellText.toLowerCase().includes('retencion') &&
              !cellText.toLowerCase().includes('autorizado')
            ) {
              if (category === 'emitidos') {
                parsed.razonSocialReceptor = cellText;
              } else {
                parsed.razonSocialEmisor = cellText;
              }
            }
          }
        }

        vouchersMap.set(key, parsed);
      });
    });
  });

  // 2. Estrategia Enlaces sueltos (botones de descarga fuera de tablas estándar)
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
        if (parsed) {
          if (filterType && filterType !== 'ALL' && parsed.tipoComprobante !== filterType) {
            return;
          }
          if (id) parsed.elementId = id;
          parsed.categoria = defaultCategory;
          vouchersMap.set(key, parsed);
        }
      }
    });
  });

  // 3. Estrategia Barrido General del Body si aún no hay resultados
  if (vouchersMap.size === 0) {
    const bodyEl = doc.body as HTMLElement | null;
    if (bodyEl) {
      const fullText = `${bodyEl.innerText || ''} ${bodyEl.textContent || ''}`;
      const generalKeys = findClavesInText(fullText);
      generalKeys.forEach((key) => {
        if (!vouchersMap.has(key)) {
          const parsed = parseClaveAcceso(key);
          if (parsed) {
            if (filterType && filterType !== 'ALL' && parsed.tipoComprobante !== filterType) {
              return;
            }
            parsed.categoria = defaultCategory;
            vouchersMap.set(key, parsed);
          }
        }
      });
    }
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

  // 5. Estrategia Iframes embebidos
  const iframes = doc.querySelectorAll('iframe');
  iframes.forEach((iframe) => {
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc && iframeDoc !== doc) {
        const iframeVouchers = extractVouchersFromDom(iframeDoc, filterType);
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

/**
 * Función de compatibilidad hacia atrás: extrae comprobantes de retención ('07').
 */
export function extractRetentionsFromDom(doc: Document = document): RetentionVoucher[] {
  return extractVouchersFromDom(doc, '07');
}

/**
 * Extrae la clave de acceso de 49 dígitos que se encuentre dentro de un diálogo modal
 * emergente de PrimeFaces / RichFaces (.ui-dialog o similar).
 */
export function extractClaveFromModalDialog(doc: Document = document): string | null {
  const dialog = doc.querySelector<HTMLElement>(
    'div.ui-dialog:not([style*="display: none"]), div.ui-dialog:not([style*="display:none"]), div.rich-modalpanel, div[id="j_idt135"], .ui-dialog'
  );

  if (!dialog) return null;
  const text = `${dialog.innerText || ''} ${dialog.textContent || ''}`;
  const keys = findClavesInText(text);
  return keys.length > 0 ? keys[0] : null;
}

/**
 * Cierra limpiamente cualquier modal de detalle del SRI haciendo clic en la 'X' de la barra de título
 * o aplicando display: none para evitar bloquear la interfaz del usuario.
 */
export function closeSriModalDialog(doc: Document = document): boolean {
  const dialog = doc.querySelector<HTMLElement>(
    'div.ui-dialog, div.rich-modalpanel, div[id="j_idt135"], .ui-dialog'
  );

  if (!dialog) return false;

  const closeBtn = dialog.querySelector<HTMLElement>(
    'a.ui-dialog-titlebar-close, .ui-dialog-titlebar-close, button.ui-dialog-titlebar-close, a[onclick*="hide"], button[title*="cerrar" i]'
  );

  if (closeBtn) {
    closeBtn.click();
    return true;
  }

  // Fallback: ocultar directamente
  dialog.style.display = 'none';
  dialog.style.visibility = 'hidden';
  return true;
}

