export interface SriQueryParams {
  year?: string | number;
  month?: string | number;
  day?: string | number;
  documentType?: string;
  estadoAutorizacion?: string;
}

export interface PaginatorState {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
}

/**
 * Selecciona una opción en un HTMLSelectElement buscando por valor o por texto visible,
 * y dispara los eventos 'change' e 'input'.
 */
export function setSelectValue(selectElement: HTMLSelectElement, valueOrText: string): boolean {
  if (!selectElement || !valueOrText) return false;
  const target = valueOrText.toString().trim().toLowerCase();

  // 1. Intento por option.value
  for (let i = 0; i < selectElement.options.length; i++) {
    const opt = selectElement.options[i];
    if (opt.value.trim().toLowerCase() === target) {
      selectElement.selectedIndex = i;
      selectElement.dispatchEvent(new Event('change', { bubbles: true }));
      selectElement.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
  }

  // 2. Intento por option.text (o coincidencia parcial)
  for (let i = 0; i < selectElement.options.length; i++) {
    const opt = selectElement.options[i];
    const text = (opt.text || opt.innerText || '').trim().toLowerCase();
    if (text === target || text.includes(target) || target.includes(text)) {
      selectElement.selectedIndex = i;
      selectElement.dispatchEvent(new Event('change', { bubbles: true }));
      selectElement.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
  }

  return false;
}

/**
 * Busca un elemento select en el formulario mediante una lista de selectores alternativos.
 */
function findSelectElement(doc: Document, selectors: string[]): HTMLSelectElement | null {
  for (const selector of selectors) {
    const el = doc.querySelector<HTMLSelectElement>(selector);
    if (el && el.tagName === 'SELECT') {
      return el;
    }
  }
  return null;
}

/**
 * Rellena los campos del formulario de consulta del SRI en Línea.
 */
export function fillSriQueryForm(doc: Document, params: SriQueryParams): boolean {
  let anyFilled = false;

  // 1. Año
  if (params.year) {
    const anoSelect = findSelectElement(doc, [
      '#frmPrincipal\\:ano',
      'select[id*="ano" i]',
      'select[id*="anio" i]',
      'select[name*="ano" i]',
      'select[name*="anio" i]',
    ]);
    if (anoSelect) {
      if (setSelectValue(anoSelect, params.year.toString())) {
        anyFilled = true;
      }
    }
  }

  // 2. Mes
  if (params.month) {
    const mesSelect = findSelectElement(doc, [
      '#frmPrincipal\\:mes',
      'select[id*="mes" i]',
      'select[name*="mes" i]',
    ]);
    if (mesSelect) {
      if (setSelectValue(mesSelect, params.month.toString())) {
        anyFilled = true;
      }
    }
  }

  // 3. Día
  if (params.day !== undefined) {
    const diaSelect = findSelectElement(doc, [
      '#frmPrincipal\\:dia',
      'select[id*="dia" i]',
      'select[name*="dia" i]',
    ]);
    if (diaSelect) {
      if (setSelectValue(diaSelect, params.day.toString())) {
        anyFilled = true;
      }
    }
  }

  // 4. Tipo de Comprobante
  if (params.documentType) {
    const tipoSelect = findSelectElement(doc, [
      '#frmPrincipal\\:cmbTipoComprobante',
      'select[id*="cmbTipoComprobante" i]',
      'select[id*="tipoComprobante" i]',
      'select[name*="tipoComprobante" i]',
    ]);
    if (tipoSelect) {
      if (setSelectValue(tipoSelect, params.documentType)) {
        anyFilled = true;
      }
    }
  }

  // 5. Estado de autorización
  if (params.estadoAutorizacion) {
    const estadoSelect = findSelectElement(doc, [
      '#frmPrincipal\\:cmbEstadoAutorizacion',
      'select[id*="cmbEstadoAutorizacion" i]',
      'select[id*="estadoAutorizacion" i]',
    ]);
    if (estadoSelect) {
      if (setSelectValue(estadoSelect, params.estadoAutorizacion)) {
        anyFilled = true;
      }
    }
  }

  return anyFilled;
}

/**
 * Dispara el evento de búsqueda o consulta en el formulario JSF.
 */
export async function triggerSriSearch(doc: Document): Promise<boolean> {
  const searchButton = doc.querySelector<HTMLElement>(
    '#frmPrincipal\\:btnBuscar, button[id*="btnBuscar" i], input[id*="btnBuscar" i], button[type="submit"], input[type="submit"]'
  );

  if (searchButton) {
    searchButton.click();
    return true;
  }

  // Fallback buscar botones por texto "Consultar" o "Buscar"
  const allButtons = Array.from(doc.querySelectorAll<HTMLElement>('button, a.btn, input[type="button"]'));
  for (const btn of allButtons) {
    const text = (btn.textContent || (btn as HTMLInputElement).value || '').toLowerCase();
    if (text.includes('consultar') || text.includes('buscar')) {
      btn.click();
      return true;
    }
  }

  return false;
}

/**
 * Obtiene el estado de la paginación (ej. "(1 de 5)").
 */
export function getPaginatorState(doc: Document): PaginatorState {
  const paginator = doc.querySelector(
    '#frmPrincipal\\:tablaCompRecibidos_paginator_bottom, #frmPrincipal\\:tablaCompEmitidos_paginator_bottom, .ui-paginator, .rich-datascr'
  );

  if (!paginator) {
    return { currentPage: 1, totalPages: 1, hasNextPage: false };
  }

  const currentSpan = paginator.querySelector('.ui-paginator-current, .rich-datascr-inact');
  let currentPage = 1;
  let totalPages = 1;

  if (currentSpan) {
    const text = currentSpan.textContent || '';
    const matches = text.match(/\d+/g);
    if (matches && matches.length >= 2) {
      currentPage = parseInt(matches[0], 10);
      totalPages = parseInt(matches[1], 10);
    }
  }

  const nextBtn = paginator.querySelector(
    '.ui-paginator-next:not(.ui-state-disabled), a.ui-paginator-next:not(.ui-state-disabled), td.rich-datascr-button:not(.rich-datascr-btn-inactive)'
  );

  const hasNextPage = !!nextBtn && currentPage < totalPages;

  return {
    currentPage,
    totalPages,
    hasNextPage,
  };
}

/**
 * Hace clic en el botón de siguiente página si está disponible.
 */
export function goToNextPage(doc: Document): boolean {
  const nextBtn = doc.querySelector<HTMLElement>(
    '#frmPrincipal\\:tablaCompRecibidos_paginator_bottom .ui-paginator-next:not(.ui-state-disabled), #frmPrincipal\\:tablaCompEmitidos_paginator_bottom .ui-paginator-next:not(.ui-state-disabled), .ui-paginator-next:not(.ui-state-disabled)'
  );

  if (nextBtn) {
    nextBtn.click();
    return true;
  }
  return false;
}
