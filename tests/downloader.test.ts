import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildSriDownloadUrl,
  isXmlValidRetention,
  xmlToDataUrl,
  fetchRetentionXml,
} from '../src/background/downloader';

describe('SRI Downloader & XML Validation', () => {
  const claveAcceso = '1509202307179001691900120010020000045671234567819';

  describe('buildSriDownloadUrl', () => {
    it('builds standard SRI XML download URL with claveAcceso', () => {
      const url = buildSriDownloadUrl(claveAcceso);
      expect(url).toContain('srienlinea.sri.gob.ec');
      expect(url).toContain('descargaXml');
      expect(url).toContain(`claveAcceso=${claveAcceso}`);
    });
  });

  describe('isXmlValidRetention', () => {
    it('returns true for XML containing comprobanteRetencion or autorizacion', () => {
      const validXml = `<?xml version="1.0" encoding="UTF-8"?>
        <autorizacion>
          <estado>AUTORIZADO</estado>
          <comprobanteRetencion id="comprobante" version="1.0.0">
            <infoTributaria><claveAcceso>${claveAcceso}</claveAcceso></infoTributaria>
          </comprobanteRetencion>
        </autorizacion>`;
      expect(isXmlValidRetention(validXml)).toBe(true);
    });

    it('returns false for HTML error pages or empty strings', () => {
      const htmlError = '<html><body><h3>Sesion expirada</h3></body></html>';
      expect(isXmlValidRetention(htmlError)).toBe(false);
      expect(isXmlValidRetention('')).toBe(false);
      expect(isXmlValidRetention('{"error":"not_found"}')).toBe(false);
    });
  });

  describe('xmlToDataUrl', () => {
    it('encodes XML string to a base64 data URL', () => {
      const xml = '<xml><test>ok</test></xml>';
      const dataUrl = xmlToDataUrl(xml);
      expect(dataUrl.startsWith('data:application/xml;base64,')).toBe(true);
    });
  });

  describe('fetchRetentionXml', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('fetches XML successfully when response is ok and content is valid XML', async () => {
      const validXml = `<?xml version="1.0"?><comprobanteRetencion><claveAcceso>${claveAcceso}</claveAcceso></comprobanteRetencion>`;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(validXml),
      } as unknown as Response);

      const result = await fetchRetentionXml(claveAcceso);
      expect(result.xmlContent).toBe(validXml);
    });

    it('throws error when server responds with 404 or 500', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Error del servidor'),
      } as unknown as Response);

      await expect(fetchRetentionXml(claveAcceso)).rejects.toThrow('Error HTTP 500');
    });

    it('throws error when server responds with non-XML HTML content', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve('<html><body>Error en consulta</body></html>'),
      } as unknown as Response);

      await expect(fetchRetentionXml(claveAcceso)).rejects.toThrow('La respuesta no es un XML válido');
    });
  });
});
