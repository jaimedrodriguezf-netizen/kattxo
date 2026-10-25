import { describe, it, expect } from 'vitest';
import {
  isValidClaveAcceso,
  isValidRuc,
  buildXmlFilename,
  getSriDocumentTypeName,
  extractDatePartsFromClaveAcceso,
  buildSriDownloadPath,
  parseCurrencyAmount,
  verifyVoucherAmountMatch,
} from '../src/domain/validators';
import { RetentionVoucher, SriVoucher, DEFAULT_QUEUE_CONFIG } from '../src/domain/types';

describe('Domain Validators & Helpers', () => {
  const validKey = '0101202407019000000000120010010000000011234567813';
  const sampleVoucher: RetentionVoucher = {
    claveAcceso: validKey,
    rucEmisor: '0190000000001',
    razonSocialEmisor: 'EMPRESA EJEMPLO S.A.',
    numeroComprobante: '001-001-000000001',
    fechaEmision: '01/01/2024',
    tipoComprobante: '07',
  };

  describe('isValidClaveAcceso', () => {
    it('accepts exact 49 numeric digits', () => {
      expect(isValidClaveAcceso(validKey)).toBe(true);
    });

    it('rejects keys shorter than 49 digits', () => {
      expect(isValidClaveAcceso('1234567890')).toBe(false);
    });

    it('rejects keys with letters or symbols', () => {
      expect(isValidClaveAcceso(validKey.slice(0, 48) + 'A')).toBe(false);
      expect(isValidClaveAcceso(validKey.slice(0, 48) + '-')).toBe(false);
    });

    it('handles whitespace trimming safely', () => {
      expect(isValidClaveAcceso(`  ${validKey}  `)).toBe(true);
    });

    it('rejects falsy or non-string inputs', () => {
      // @ts-expect-error test invalid type
      expect(isValidClaveAcceso(null)).toBe(false);
      // @ts-expect-error test invalid type
      expect(isValidClaveAcceso(undefined)).toBe(false);
      expect(isValidClaveAcceso('')).toBe(false);
    });
  });

  describe('isValidRuc', () => {
    it('accepts 13 numeric digits', () => {
      expect(isValidRuc('0190000000001')).toBe(true);
    });

    it('rejects non-13 digit strings', () => {
      expect(isValidRuc('0190000000')).toBe(false);
      expect(isValidRuc('01900000000001')).toBe(false);
    });

    it('rejects alphanumeric strings', () => {
      expect(isValidRuc('019000000000A')).toBe(false);
    });
  });

  describe('buildXmlFilename', () => {
    it('builds filename with default directory', () => {
      const filename = buildXmlFilename(sampleVoucher);
      expect(filename).toBe(`Kattxo/Retenciones/retencion_${validKey}.xml`);
    });

    it('handles custom directory and cleans slashes', () => {
      const filename = buildXmlFilename(sampleVoucher, '/custom/path/');
      expect(filename).toBe(`custom/path/retencion_${validKey}.xml`);
    });

    it('handles empty directory cleanly', () => {
      const filename = buildXmlFilename(sampleVoucher, '');
      expect(filename).toBe(`retencion_${validKey}.xml`);
    });
  });

  describe('getSriDocumentTypeName', () => {
    it('maps standard SRI document type codes to human-readable names', () => {
      expect(getSriDocumentTypeName('01')).toBe('Factura');
      expect(getSriDocumentTypeName('03')).toBe('Liquidacion_Compra');
      expect(getSriDocumentTypeName('04')).toBe('Nota_Credito');
      expect(getSriDocumentTypeName('05')).toBe('Nota_Debito');
      expect(getSriDocumentTypeName('06')).toBe('Guia_Remision');
      expect(getSriDocumentTypeName('07')).toBe('Retencion');
      expect(getSriDocumentTypeName('99')).toBe('Comprobante');
      expect(getSriDocumentTypeName('')).toBe('Comprobante');
    });
  });

  describe('extractDatePartsFromClaveAcceso', () => {
    it('extracts day, month, and year from first 8 digits', () => {
      const parts = extractDatePartsFromClaveAcceso(validKey);
      expect(parts).toEqual({
        day: '01',
        month: '01',
        year: '2024',
      });
    });

    it('handles invalid or shorter keys safely without throwing', () => {
      expect(extractDatePartsFromClaveAcceso('')).toEqual({
        day: '00',
        month: '00',
        year: '0000',
      });
    });
  });

  describe('buildSriDownloadPath', () => {
    const facturaVoucher: SriVoucher = {
      claveAcceso: '1508202401179000000000120010020000000451234567812',
      rucEmisor: '1790000000001',
      razonSocialEmisor: 'PROVEEDOR S.A.',
      numeroComprobante: '001-002-000000045',
      fechaEmision: '15/08/2024',
      tipoComprobante: '01',
    };

    it('builds structured hierarchical path by default: Kattxo/Recibidos/RUC/Año/Mes/Tipo/Archivo.xml', () => {
      const path = buildSriDownloadPath(facturaVoucher, { taxpayerRuc: '1799999999001' });
      expect(path).toBe(
        'Kattxo/Recibidos/1799999999001/2024/08/Factura/factura_001-002-000000045_1508202401179000000000120010020000000451234567812.xml'
      );
    });

    it('supports Emitidos category segregation: Kattxo/Emitidos/RUC/Año/Mes/Tipo/Archivo.xml', () => {
      const path = buildSriDownloadPath(facturaVoucher, {
        taxpayerRuc: '1799999999001',
        category: 'emitidos',
      });
      expect(path).toBe(
        'Kattxo/Emitidos/1799999999001/2024/08/Factura/factura_001-002-000000045_1508202401179000000000120010020000000451234567812.xml'
      );
    });

    it('supports PDF format for RIDE', () => {
      const path = buildSriDownloadPath(facturaVoucher, {
        taxpayerRuc: '1799999999001',
        format: 'pdf',
      });
      expect(path).toBe(
        'Kattxo/Recibidos/1799999999001/2024/08/Factura/factura_001-002-000000045_1508202401179000000000120010020000000451234567812.pdf'
      );
    });

    it('falls back to emisor RUC if taxpayerRuc is not provided', () => {
      const path = buildSriDownloadPath(facturaVoucher);
      expect(path).toContain('Kattxo/Recibidos/1790000000001/2024/08/Factura/');
    });
  });

  describe('DEFAULT_QUEUE_CONFIG', () => {
    it('sets safe default throttling and concurrency', () => {
      expect(DEFAULT_QUEUE_CONFIG.concurrency).toBe(1);
      expect(DEFAULT_QUEUE_CONFIG.delayBetweenRequestsMs).toBeGreaterThanOrEqual(250);
      expect(DEFAULT_QUEUE_CONFIG.maxRetries).toBe(3);
    });
  });

  describe('parseCurrencyAmount', () => {
    it('parses numeric values and strings with $ symbols and spaces', () => {
      expect(parseCurrencyAmount('$ 125.50')).toBe(125.5);
      expect(parseCurrencyAmount('1,250.00')).toBe(1250);
      expect(parseCurrencyAmount('150.75')).toBe(150.75);
      expect(parseCurrencyAmount(45.99)).toBe(45.99);
    });

    it('handles commas as decimal separator (e.g. 125,50)', () => {
      expect(parseCurrencyAmount('125,50')).toBe(125.5);
    });

    it('returns 0 for invalid or empty amounts safely', () => {
      expect(parseCurrencyAmount('')).toBe(0);
      expect(parseCurrencyAmount(null)).toBe(0);
      expect(parseCurrencyAmount('invalid')).toBe(0);
    });
  });

  describe('verifyVoucherAmountMatch (Cuadre Contable)', () => {
    it('confirms match when amounts are identical', () => {
      expect(verifyVoucherAmountMatch(150.25, 150.25)).toBe(true);
      expect(verifyVoucherAmountMatch('$ 150.25', '150.25')).toBe(true);
    });

    it('confirms match within tolerance threshold (<= 0.005)', () => {
      expect(verifyVoucherAmountMatch(100.002, 100.004)).toBe(true);
    });

    it('rejects mismatch when difference exceeds 0.005 (desincronización detectada)', () => {
      expect(verifyVoucherAmountMatch(100.0, 105.0)).toBe(false);
      expect(verifyVoucherAmountMatch('$ 10.50', '$ 10.60')).toBe(false);
    });

    it('returns true if one amount is missing (0) so it does not block unpriced receipts', () => {
      expect(verifyVoucherAmountMatch(0, 150.25)).toBe(true);
      expect(verifyVoucherAmountMatch(150.25, 0)).toBe(true);
    });
  });
});
