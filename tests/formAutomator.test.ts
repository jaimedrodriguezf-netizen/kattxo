import { describe, it, expect, beforeEach } from 'vitest';
import {
  setSelectValue,
  fillSriQueryForm,
  triggerSriSearch,
  getPaginatorState,
  goToNextPage,
  triggerSriTxtReportDownload,
  SriQueryParams,
} from '../src/content/formAutomator';

describe('SRI Form Automator & Paginator', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('setSelectValue', () => {
    it('sets select value by option value or text content', () => {
      document.body.innerHTML = `
        <select id="testSelect">
          <option value="01">Factura</option>
          <option value="07">Retención</option>
        </select>
      `;
      const select = document.getElementById('testSelect') as HTMLSelectElement;
      let changed = false;
      select.addEventListener('change', () => {
        changed = true;
      });

      const res = setSelectValue(select, '07');
      expect(res).toBe(true);
      expect(select.value).toBe('07');
      expect(changed).toBe(true);

      // Match by label
      const resText = setSelectValue(select, 'Factura');
      expect(resText).toBe(true);
      expect(select.value).toBe('01');
    });

    it('returns false when option is not found', () => {
      document.body.innerHTML = `<select id="testSelect"><option value="01">Factura</option></select>`;
      const select = document.getElementById('testSelect') as HTMLSelectElement;
      expect(setSelectValue(select, '999')).toBe(false);
    });
  });

  describe('fillSriQueryForm', () => {
    it('locates and populates SRI form dropdowns by exact ID or flexible names', () => {
      document.body.innerHTML = `
        <form id="frmPrincipal">
          <select id="frmPrincipal:ano">
            <option value="2023">2023</option>
            <option value="2024">2024</option>
          </select>
          <select id="frmPrincipal:mes">
            <option value="1">Enero</option>
            <option value="8">Agosto</option>
          </select>
          <select id="frmPrincipal:dia">
            <option value="0">TODOS</option>
            <option value="15">15</option>
          </select>
          <select id="frmPrincipal:cmbTipoComprobante">
            <option value="1">FACTURA</option>
            <option value="7">COMPROBANTE DE RETENCIÓN</option>
          </select>
          <button id="frmPrincipal:btnBuscar" type="submit">Consultar</button>
        </form>
      `;

      const params: SriQueryParams = {
        year: '2024',
        month: 'Agosto',
        day: '15',
        documentType: 'FACTURA',
      };

      const result = fillSriQueryForm(document, params);
      expect(result).toBe(true);

      const selAno = document.getElementById('frmPrincipal:ano') as HTMLSelectElement;
      const selMes = document.getElementById('frmPrincipal:mes') as HTMLSelectElement;
      const selDia = document.getElementById('frmPrincipal:dia') as HTMLSelectElement;
      const selTipo = document.getElementById('frmPrincipal:cmbTipoComprobante') as HTMLSelectElement;

      expect(selAno.value).toBe('2024');
      expect(selMes.value).toBe('8');
      expect(selDia.value).toBe('15');
      expect(selTipo.value).toBe('1');
    });

    it('populates comprobantesEmitidos.jsf calendar text inputs (DD/MM/YYYY)', () => {
      document.body.innerHTML = `
        <form id="frmPrincipal">
          <input type="text" id="frmPrincipal:calendarFechaDesde_input" />
          <input type="text" id="frmPrincipal:calendarFechaHasta_input" />
          <input type="text" id="frmPrincipal:txtParametro" />
          <select id="frmPrincipal:cmbTipoComprobante">
            <option value="1">FACTURA</option>
          </select>
        </form>
      `;

      let inputDispatched = false;
      const inputDesde = document.getElementById('frmPrincipal:calendarFechaDesde_input') as HTMLInputElement;
      inputDesde.addEventListener('input', () => {
        inputDispatched = true;
      });

      const params: SriQueryParams = {
        dateFrom: '2024-08-01',
        dateTo: '2024-08-15',
        documentType: 'FACTURA',
        parametroRuc: '1790011223001',
      };

      const result = fillSriQueryForm(document, params);
      expect(result).toBe(true);

      expect(inputDesde.value).toBe('01/08/2024');
      const inputHasta = document.getElementById('frmPrincipal:calendarFechaHasta_input') as HTMLInputElement;
      expect(inputHasta.value).toBe('15/08/2024');

      const txtParametro = document.getElementById('frmPrincipal:txtParametro') as HTMLInputElement;
      expect(txtParametro.value).toBe('1790011223001');

      expect(inputDispatched).toBe(true);
    });

    it('formats year/month/day components to DD/MM/YYYY for calendar inputs when dateFrom is not given', () => {
      document.body.innerHTML = `
        <form id="frmPrincipal">
          <input type="text" id="frmPrincipal:calendarFechaDesde_input" />
        </form>
      `;

      const params: SriQueryParams = {
        year: '2024',
        month: '5',
        day: '7',
      };

      fillSriQueryForm(document, params);
      const inputDesde = document.getElementById('frmPrincipal:calendarFechaDesde_input') as HTMLInputElement;
      expect(inputDesde.value).toBe('07/05/2024');
    });
  });

  describe('triggerSriSearch', () => {
    it('clicks the search button and returns true', async () => {
      document.body.innerHTML = `
        <button id="frmPrincipal:btnBuscar" type="button">Consultar</button>
      `;
      let clicked = false;
      document.getElementById('frmPrincipal:btnBuscar')?.addEventListener('click', () => {
        clicked = true;
      });

      const triggered = await triggerSriSearch(document);
      expect(triggered).toBe(true);
      expect(clicked).toBe(true);
    });
  });

  describe('getPaginatorState and goToNextPage', () => {
    it('reads PrimeFaces paginator state (e.g. "1 de 5")', () => {
      document.body.innerHTML = `
        <div id="frmPrincipal:tablaCompRecibidos_paginator_bottom">
          <span class="ui-paginator-current">(1 de 5)</span>
          <span class="ui-paginator-next ui-state-default">Siguiente</span>
        </div>
      `;

      const state = getPaginatorState(document);
      expect(state.currentPage).toBe(1);
      expect(state.totalPages).toBe(5);
      expect(state.hasNextPage).toBe(true);
    });

    it('detects disabled next page state', () => {
      document.body.innerHTML = `
        <div id="frmPrincipal:tablaCompRecibidos_paginator_bottom">
          <span class="ui-paginator-current">(5 de 5)</span>
          <span class="ui-paginator-next ui-state-disabled">Siguiente</span>
        </div>
      `;

      const state = getPaginatorState(document);
      expect(state.currentPage).toBe(5);
      expect(state.totalPages).toBe(5);
      expect(state.hasNextPage).toBe(false);
    });

    it('clicks next page when available', () => {
      document.body.innerHTML = `
        <div id="frmPrincipal:tablaCompRecibidos_paginator_bottom">
          <span class="ui-paginator-current">(1 de 3)</span>
          <a class="ui-paginator-next ui-state-default">Siguiente</a>
        </div>
      `;
      let clicked = false;
      document.querySelector('.ui-paginator-next')?.addEventListener('click', () => {
        clicked = true;
      });

      const success = goToNextPage(document);
      expect(success).toBe(true);
      expect(clicked).toBe(true);
    });
  });

  describe('triggerSriTxtReportDownload', () => {
    it('clicks the link by exact ID #frmPrincipal:lnkTxtlistado', async () => {
      document.body.innerHTML = `
        <a id="frmPrincipal:lnkTxtlistado" href="#">Descargar Listado</a>
      `;
      let clicked = false;
      document.getElementById('frmPrincipal:lnkTxtlistado')?.addEventListener('click', (e) => {
        e.preventDefault();
        clicked = true;
      });

      const result = await triggerSriTxtReportDownload(document);
      expect(result).toBe(true);
      expect(clicked).toBe(true);
    });

    it('clicks link/button matching partial ID lnkTxtlistado', async () => {
      document.body.innerHTML = `
        <a id="someForm:lnkTxtlistado_button" href="#">Exportar</a>
      `;
      let clicked = false;
      document.getElementById('someForm:lnkTxtlistado_button')?.addEventListener('click', (e) => {
        e.preventDefault();
        clicked = true;
      });

      const result = await triggerSriTxtReportDownload(document);
      expect(result).toBe(true);
      expect(clicked).toBe(true);
    });

    it('clicks element by text containing "descargar listado"', async () => {
      document.body.innerHTML = `
        <button type="button" class="btn">Descargar Listado de Comprobantes</button>
      `;
      let clicked = false;
      document.querySelector('button')?.addEventListener('click', () => {
        clicked = true;
      });

      const result = await triggerSriTxtReportDownload(document);
      expect(result).toBe(true);
      expect(clicked).toBe(true);
    });

    it('clicks element by text containing "reporte txt"', async () => {
      document.body.innerHTML = `
        <a href="#" class="btn-export">Reporte TXT</a>
      `;
      let clicked = false;
      document.querySelector('a')?.addEventListener('click', (e) => {
        e.preventDefault();
        clicked = true;
      });

      const result = await triggerSriTxtReportDownload(document);
      expect(result).toBe(true);
      expect(clicked).toBe(true);
    });

    it('returns false when no matching element is present', async () => {
      document.body.innerHTML = `<div><p>No buttons here</p></div>`;
      const result = await triggerSriTxtReportDownload(document);
      expect(result).toBe(false);
    });
  });
});
