import { describe, it, expect } from 'vitest';
import { parseClaveAcceso, extractRetentionsFromDom, findClavesInText } from '../src/content/parser';

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
});
