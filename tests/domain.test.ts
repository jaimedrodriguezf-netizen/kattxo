import { describe, it, expect } from 'vitest';
import { isValidClaveAcceso, isValidRuc, buildXmlFilename } from '../src/domain/validators';
import { RetentionVoucher, DEFAULT_QUEUE_CONFIG } from '../src/domain/types';

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

  describe('DEFAULT_QUEUE_CONFIG', () => {
    it('sets safe default throttling and concurrency', () => {
      expect(DEFAULT_QUEUE_CONFIG.concurrency).toBe(1);
      expect(DEFAULT_QUEUE_CONFIG.delayBetweenRequestsMs).toBeGreaterThanOrEqual(250);
      expect(DEFAULT_QUEUE_CONFIG.maxRetries).toBe(3);
    });
  });
});
