import { describe, it, expect } from 'vitest';
import {
  parseClaveAcceso,
  extractRetentionsFromDom,
  extractVouchersFromDom,
  extractTaxpayerProfileFromDom,
  extractClaveFromModalDialog,
  closeSriModalDialog,
  findClavesInText,
} from '../src/content/parser';

describe('SRI Parser & Clave de Acceso Decomposition', () => {
  const sampleKeyRetencion = '1509202307179001691900120010020000045671234567819';
  const sampleKeyFactura = '1509202301179001691900120010020000045671234567819';
  const realUserSriKey = '0409202607179317071400120010010000026416236568918';

  describe('findClavesInText', () => {
    it('finds standalone 49-digit keys', () => {
      const keys = findClavesInText(`Texto con clave ${sampleKeyRetencion} fin`);
      expect(keys).toEqual([sampleKeyRetencion]);
    });

    it('finds 49-digit keys concatenated with letters (RichFaces table cell gluing)', () => {
      const glued = `${realUserSriKey}AUTORIZADO001`;
      const keys = findClavesInText(glued);
      expect(keys).toEqual([realUserSriKey]);
    });
  });

  describe('parseClaveAcceso', () => {
    it('decomposes a valid 49-digit retention clave de acceso', () => {
      const parsed = parseClaveAcceso(sampleKeyRetencion);
      expect(parsed).not.toBeNull();
      expect(parsed?.claveAcceso).toBe(sampleKeyRetencion);
      expect(parsed?.tipoComprobante).toBe('07');
      expect(parsed?.rucEmisor).toBe('1790016919001');
      expect(parsed?.fechaEmision).toBe('15/09/2023');
      expect(parsed?.numeroComprobante).toBe('001-002-000004567');
    });

    it('decomposes real SRI key from user production test', () => {
      const parsed = parseClaveAcceso(realUserSriKey);
      expect(parsed).not.toBeNull();
      expect(parsed?.claveAcceso).toBe(realUserSriKey);
      expect(parsed?.tipoComprobante).toBe('07');
      expect(parsed?.rucEmisor).toBe('1793170714001');
      expect(parsed?.numeroComprobante).toBe('001-001-000002641');
    });

    it('identifies invoice (01) type correctly', () => {
      const parsed = parseClaveAcceso(sampleKeyFactura);
      expect(parsed?.tipoComprobante).toBe('01');
    });

    it('returns null for invalid keys', () => {
      expect(parseClaveAcceso('12345')).toBeNull();
      expect(parseClaveAcceso('invalid-non-numeric-49-chars-string-padding-here-x')).toBeNull();
    });
  });

  describe('extractRetentionsFromDom', () => {
    it('extracts retention vouchers from an HTML table', () => {
      document.body.innerHTML = `
        <div id="contenido">
          <table class="ui-datatable">
            <thead>
              <tr>
                <th>Razón Social</th>
                <th>Comprobante</th>
                <th>Número</th>
                <th>Fecha</th>
                <th>Clave de Acceso / Autorización</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>CORPORACION FAVORITA C.A.</td>
                <td>Comprobante de Retención</td>
                <td>001-002-000004567</td>
                <td>15/09/2023</td>
                <td><span>${sampleKeyRetencion}</span></td>
              </tr>
              <tr>
                <td>OTRO PROVEEDOR S.A.</td>
                <td>Factura</td>
                <td>001-001-000000999</td>
                <td>15/09/2023</td>
                <td><span>${sampleKeyFactura}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      `;

      const vouchers = extractRetentionsFromDom(document);
      expect(vouchers).toHaveLength(1);
      expect(vouchers[0].claveAcceso).toBe(sampleKeyRetencion);
      expect(vouchers[0].tipoComprobante).toBe('07');
      expect(vouchers[0].razonSocialEmisor).toContain('CORPORACION FAVORITA');
      expect(vouchers[0].numeroComprobante).toBe('001-002-000004567');
    });

    it('extracts real SRI key even if rendered in a general body div or RichFaces table', () => {
      document.body.innerHTML = `
        <div id="form:tablaRecibidos">
          <table>
            <tr>
              <td>EMPRESA X</td>
              <td>${realUserSriKey}</td>
              <td>AUTORIZADO</td>
            </tr>
          </table>
        </div>
      `;

      const vouchers = extractRetentionsFromDom(document);
      expect(vouchers).toHaveLength(1);
      expect(vouchers[0].claveAcceso).toBe(realUserSriKey);
      expect(vouchers[0].tipoComprobante).toBe('07');
    });

    it('extracts vouchers from links or download buttons', () => {
      document.body.innerHTML = `
        <div>
          <a href="/tuportal-internet/descargar?claveAcceso=${sampleKeyRetencion}">Descargar XML</a>
        </div>
      `;

      const vouchers = extractRetentionsFromDom(document);
      expect(vouchers).toHaveLength(1);
      expect(vouchers[0].claveAcceso).toBe(sampleKeyRetencion);
      expect(vouchers[0].tipoComprobante).toBe('07');
    });

    it('deduplicates multiple occurrences of the same clave de acceso', () => {
      document.body.innerHTML = `
        <div>
          <p>${sampleKeyRetencion}</p>
          <a href="?clave=${sampleKeyRetencion}">XML</a>
          <table><tr><td>${sampleKeyRetencion}</td></tr></table>
        </div>
      `;

      const vouchers = extractRetentionsFromDom(document);
      expect(vouchers).toHaveLength(1);
    });

    it('returns empty array when no retention vouchers are in DOM', () => {
      document.body.innerHTML = `<div><p>No se encontraron resultados para la búsqueda.</p></div>`;
      const vouchers = extractRetentionsFromDom(document);
      expect(vouchers).toEqual([]);
    });
  });

  describe('extractVouchersFromDom (Universal Parser)', () => {
    it('extracts all types of vouchers when filter is null or ALL', () => {
      document.body.innerHTML = `
        <table>
          <tbody>
            <tr>
              <td>PROVEEDOR FACTURA S.A.</td>
              <td>Factura</td>
              <td>001-001-000000001</td>
              <td><span>${sampleKeyFactura}</span></td>
              <td>
                <a id="frm:tabla:0:lnkXml" title="Descargar XML">XML</a>
                <a id="frm:tabla:0:lnkPdf" title="Descargar RIDE">PDF</a>
              </td>
            </tr>
            <tr>
              <td>AGENTE RETENCION C.A.</td>
              <td>Comprobante de Retención</td>
              <td>001-002-000004567</td>
              <td><span>${sampleKeyRetencion}</span></td>
              <td>
                <a id="frm:tabla:1:lnkXml" title="Descargar XML">XML</a>
              </td>
            </tr>
          </tbody>
        </table>
      `;

      const vouchers = extractVouchersFromDom(document);
      expect(vouchers).toHaveLength(2);

      const factura = vouchers.find((v) => v.tipoComprobante === '01');
      expect(factura).toBeDefined();
      expect(factura?.elementId).toBe('frm:tabla:0:lnkXml');
      expect(factura?.elementPdfId).toBe('frm:tabla:0:lnkPdf');

      const retencion = vouchers.find((v) => v.tipoComprobante === '07');
      expect(retencion).toBeDefined();
      expect(retencion?.elementId).toBe('frm:tabla:1:lnkXml');
    });

    it('filters strictly by document type when filter is provided (e.g. 01 for Factura)', () => {
      const facturas = extractVouchersFromDom(document, '01');
      expect(facturas).toHaveLength(1);
      expect(facturas[0].tipoComprobante).toBe('01');
    });

    it('detects emitidos category when table header indicates receptor', () => {
      document.body.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>RUC Receptor</th>
              <th>Razón Social Receptor</th>
              <th>Número</th>
              <th>Clave</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1799999999001</td>
              <td>CLIENTE FINAL CIA. LTDA.</td>
              <td>001-001-000000001</td>
              <td>${sampleKeyFactura}</td>
            </tr>
          </tbody>
        </table>
      `;

      const vouchers = extractVouchersFromDom(document);
      expect(vouchers).toHaveLength(1);
      expect(vouchers[0].categoria).toBe('emitidos');
      expect(vouchers[0].razonSocialReceptor).toBe('CLIENTE FINAL CIA. LTDA.');
    });

    it('extracts total amount from row cell when formatted as currency', () => {
      document.body.innerHTML = `
        <table>
          <tbody>
            <tr>
              <td>PROVEEDOR S.A.</td>
              <td>Factura</td>
              <td>001-001-000000001</td>
              <td>$ 250.75</td>
              <td>${sampleKeyFactura}</td>
            </tr>
          </tbody>
        </table>
      `;

      const vouchers = extractVouchersFromDom(document);
      expect(vouchers).toHaveLength(1);
      expect(vouchers[0].totalImporte).toBe(250.75);
    });
  });

  describe('extractTaxpayerProfileFromDom', () => {
    it('extracts taxpayer profile from SRI perfil page DOM classes', () => {
      document.body.innerHTML = `
        <div id="sribody">
          <label class="titulo-campo porciento nombre-contribuyente">
            JUAN PEREZ COMERCIAL
          </label>
          <label class="titulo-campo porciento titulo-perfil animated fadeInUp">
            1712345678001
          </label>
        </div>
      `;

      const profile = extractTaxpayerProfileFromDom(document);
      expect(profile).not.toBeNull();
      expect(profile?.ruc).toBe('1712345678001');
      expect(profile?.razonSocial).toBe('JUAN PEREZ COMERCIAL');
    });

    it('extracts taxpayer profile from header / navbar badges', () => {
      document.body.innerHTML = `
        <div class="navbar-header">
          <span class="user-info">RUC: 0190000000001 - KATTXO SOLUCIONES</span>
        </div>
      `;

      const profile = extractTaxpayerProfileFromDom(document);
      expect(profile).not.toBeNull();
      expect(profile?.ruc).toBe('0190000000001');
      expect(profile?.razonSocial).toContain('KATTXO SOLUCIONES');
    });

    it('returns null if no taxpayer data is found in DOM', () => {
      document.body.innerHTML = '<div>Página no autenticada</div>';
      const profile = extractTaxpayerProfileFromDom(document);
      expect(profile).toBeNull();
    });
  });

  describe('Modal Dialog Extractor & Closer (PrimeFaces / RichFaces)', () => {
    it('extracts 49-digit clave from open PrimeFaces dialog modal', () => {
      document.body.innerHTML = `
        <div class="ui-dialog" style="display: block;">
          <div class="ui-dialog-titlebar">
            <span>Detalle de Comprobante</span>
            <a class="ui-dialog-titlebar-close" href="#">✕</a>
          </div>
          <div class="ui-dialog-content">
            <p>Clave de Acceso: ${sampleKeyFactura}</p>
            <p>Autorización: AUTORIZADO</p>
          </div>
        </div>
      `;

      const key = extractClaveFromModalDialog(document);
      expect(key).toBe(sampleKeyFactura);
    });

    it('closes the modal dialog by clicking close button or hiding element', () => {
      let closeClicked = false;
      document.body.innerHTML = `
        <div class="ui-dialog" style="display: block;">
          <a class="ui-dialog-titlebar-close" href="#">✕</a>
        </div>
      `;

      document.querySelector('.ui-dialog-titlebar-close')?.addEventListener('click', () => {
        closeClicked = true;
      });

      const closed = closeSriModalDialog(document);
      expect(closed).toBe(true);
      expect(closeClicked).toBe(true);
    });

    it('returns null if no modal dialog is present in DOM', () => {
      document.body.innerHTML = '<div>Sin modales</div>';
      expect(extractClaveFromModalDialog(document)).toBeNull();
      expect(closeSriModalDialog(document)).toBe(false);
    });
  });
});
