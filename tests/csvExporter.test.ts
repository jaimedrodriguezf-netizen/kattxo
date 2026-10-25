import { describe, it, expect } from 'vitest';
import { vouchersToCsv, buildCsvFilename, sanitizeCsvCell } from '../src/domain/csvExporter';
import { SriVoucher } from '../src/domain/types';

describe('CSV Exporter', () => {
  describe('sanitizeCsvCell', () => {
    it('returns empty string for null or undefined', () => {
      expect(sanitizeCsvCell(undefined)).toBe('');
      expect(sanitizeCsvCell(null)).toBe('');
    });

    it('returns string untouched if no delimiter, quote, or newline', () => {
      expect(sanitizeCsvCell('Factura')).toBe('Factura');
      expect(sanitizeCsvCell('1790012345001')).toBe('1790012345001');
    });

    it('escapes quotes by doubling them and wrapping in quotes', () => {
      expect(sanitizeCsvCell('EMPRESA "EL SOL" S.A.')).toBe('"EMPRESA ""EL SOL"" S.A."');
    });

    it('wraps text in quotes if it contains semicolons', () => {
      expect(sanitizeCsvCell('Comprobante; electr\u00f3nico')).toBe('"Comprobante; electr\u00f3nico"');
    });

    it('wraps text in quotes if it contains newlines', () => {
      expect(sanitizeCsvCell("Linea 1\nLinea 2")).toBe('"Linea 1\nLinea 2"');
      expect(sanitizeCsvCell("Linea 1\r\nLinea 2")).toBe('"Linea 1\r\nLinea 2"');
    });

    it('handles both quotes and semicolons correctly', () => {
      expect(sanitizeCsvCell('Item "A"; Item "B"')).toBe('"Item ""A""; Item ""B"""');
    });
  });

  describe('vouchersToCsv', () => {
    const headerRow = 'Fecha Emisi\u00f3n;Tipo Comprobante;Nombre Tipo;RUC Emisor;Raz\u00f3n Social Emisor;Identificaci\u00f3n Receptor;Raz\u00f3n Social Receptor;N\u00famero Comprobante;Clave de Acceso;Estado';

    it('starts with UTF-8 BOM (\\uFEFF)', () => {
      const csv = vouchersToCsv([]);
      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv.charCodeAt(0)).toBe(0xFEFF);
    });

    it('generates proper header row when empty', () => {
      const csv = vouchersToCsv([]);
      const lines = csv.replace('\uFEFF', '').trim().split('\r\n');
      expect(lines[0]).toBe(headerRow);
      expect(lines.length).toBe(1);
    });

    it('formats a single voucher correctly with semicolon delimiter', () => {
      const voucher: SriVoucher = {
        claveAcceso: '0101202401179001234500120010010000000011234567813',
        rucEmisor: '1790012345001',
        razonSocialEmisor: 'COMERCIAL ABC CIA. LTDA.',
        identificacionSujetoRetenido: '1712345678',
        razonSocialReceptor: 'JUAN PEREZ',
        numeroComprobante: '001-001-000000001',
        fechaEmision: '01/01/2024',
        tipoComprobante: '01',
        estado: 'AUTORIZADO',
      };

      const csv = vouchersToCsv([voucher]);
      const lines = csv.replace('\uFEFF', '').trim().split('\r\n');
      expect(lines.length).toBe(2);
      expect(lines[0]).toBe(headerRow);

      const expectedRow = '01/01/2024;01;Factura;1790012345001;COMERCIAL ABC CIA. LTDA.;1712345678;JUAN PEREZ;001-001-000000001;0101202401179001234500120010010000000011234567813;AUTORIZADO';
      expect(lines[1]).toBe(expectedRow);
    });

    it('maps retention document type (07) to Retencion name', () => {
      const voucher: SriVoucher = {
        claveAcceso: '0202202407179001234500120010010000000021234567814',
        rucEmisor: '1790012345001',
        razonSocialEmisor: 'BANCO PICHINCHA C.A.',
        numeroComprobante: '001-001-000000002',
        fechaEmision: '02/02/2024',
        tipoComprobante: '07',
      };

      const csv = vouchersToCsv([voucher]);
      const lines = csv.replace('\uFEFF', '').trim().split('\r\n');
      const fields = lines[1].split(';');
      expect(fields[1]).toBe('07');
      expect(fields[2]).toBe('Retencion');
      expect(fields[5]).toBe(''); // identificacionSujetoRetenido undefined
      expect(fields[6]).toBe(''); // razonSocialReceptor undefined
      expect(fields[9]).toBe(''); // estado undefined
    });

    it('sanitizes fields containing quotes, semicolons, and newlines', () => {
      const voucher: SriVoucher = {
        claveAcceso: '0303202404179001234500120010010000000031234567815',
        rucEmisor: '1790012345001',
        razonSocialEmisor: 'ACME "SOLUCIONES"; S.A.\nSUCURSAL 1',
        identificacionSujetoRetenido: '1712345678',
        razonSocialReceptor: 'CONSUMIDOR; FINAL',
        numeroComprobante: '001-001-000000003',
        fechaEmision: '03/03/2024',
        tipoComprobante: '04',
        estado: 'EN PROCESO',
      };

      const csv = vouchersToCsv([voucher]);
      expect(csv).toContain('"ACME ""SOLUCIONES""; S.A.\nSUCURSAL 1"');
      expect(csv).toContain('"CONSUMIDOR; FINAL"');
    });

    it('formats multiple vouchers preserving order', () => {
      const v1: SriVoucher = {
        claveAcceso: '1111111111111111111111111111111111111111111111111',
        rucEmisor: '1790000000001',
        razonSocialEmisor: 'EMPRESA 1',
        numeroComprobante: '001-001-000000001',
        fechaEmision: '10/01/2024',
        tipoComprobante: '01',
      };
      const v2: SriVoucher = {
        claveAcceso: '2222222222222222222222222222222222222222222222222',
        rucEmisor: '1790000000002',
        razonSocialEmisor: 'EMPRESA 2',
        numeroComprobante: '001-001-000000002',
        fechaEmision: '20/01/2024',
        tipoComprobante: '07',
      };

      const csv = vouchersToCsv([v1, v2]);
      const lines = csv.replace('\uFEFF', '').trim().split('\r\n');
      expect(lines.length).toBe(3);
      expect(lines[1]).toContain('1111111111111111111111111111111111111111111111111');
      expect(lines[2]).toContain('2222222222222222222222222222222222222222222222222');
    });
  });

  describe('buildCsvFilename', () => {
    it('builds default path when period is omitted', () => {
      const filename = buildCsvFilename('1790012345001');
      expect(filename).toBe('Kattxo/1790012345001/reporte_comprobantes_1790012345001.csv');
    });

    it('builds structured path when period is YYYY-MM', () => {
      const filename = buildCsvFilename('1790012345001', '2024-08');
      expect(filename).toBe('Kattxo/1790012345001/2024/08/reporte_comprobantes_1790012345001_2024-08.csv');
    });

    it('builds structured path when period is YYYY/MM', () => {
      const filename = buildCsvFilename('1790012345001', '2024/05');
      expect(filename).toBe('Kattxo/1790012345001/2024/05/reporte_comprobantes_1790012345001_2024-05.csv');
    });

    it('builds structured path when period is YYYY', () => {
      const filename = buildCsvFilename('1790012345001', '2024');
      expect(filename).toBe('Kattxo/1790012345001/2024/reporte_comprobantes_1790012345001_2024.csv');
    });

    it('falls back to default SRI taxpayer if ruc is empty', () => {
      const filename = buildCsvFilename('');
      expect(filename).toBe('Kattxo/SRI/reporte_comprobantes_SRI.csv');
    });
  });
});
