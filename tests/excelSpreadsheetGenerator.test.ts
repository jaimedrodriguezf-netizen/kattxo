import { describe, it, expect } from 'vitest';
import {
  exportVouchersToExcelXml,
  buildExcelFilename,
} from '../src/domain/excelSpreadsheetGenerator';
import { SriVoucher } from '../src/domain/types';

describe('excelSpreadsheetGenerator', () => {
  const makeVoucher = (clave: string, tipo: string, total: number): SriVoucher => ({
    claveAcceso: clave,
    rucEmisor: '0190000000001',
    razonSocialEmisor: 'EMPRESA DEMO S.A.',
    numeroComprobante: '001-001-000000123',
    fechaEmision: '14/05/2024',
    tipoComprobante: tipo,
    totalImporte: total,
    estado: 'AUTORIZADO',
  });

  const kFactura = '1405202401019000000000120010010000001231234567818';
  const kRetencion = '1505202407179000000000120020020000004568765432115';

  it('genera un documento XML válido con esquema SpreadsheetML y hojas múltiples', () => {
    const vouchers = [
      makeVoucher(kFactura, '01', 115.0),
      makeVoucher(kRetencion, '07', 50.0),
    ];

    const xml = exportVouchersToExcelXml(vouchers, { ruc: '0190000000001', razonSocial: 'EMPRESA DEMO' });

    expect(xml.startsWith('<?xml version="1.0"')).toBe(true);
    expect(xml).toContain('xmlns="urn:schemas-microsoft-com:office:spreadsheet"');
    expect(xml).toContain('ss:Name="Resumen General"');
    expect(xml).toContain('ss:Name="Facturas"');
    expect(xml).toContain('ss:Name="Retenciones"');
    expect(xml).toContain('ss:Name="Todos los Comprobantes"');

    // Valida estilos y tipos de datos
    expect(xml).toContain('ss:Type="Number">115');
    expect(xml).toContain('ss:Type="Number">50');
    expect(xml).toContain(`ss:Type="String">${kFactura}`);
    expect(xml).toContain('EMPRESA DEMO S.A.');
  });

  it('calcula totales acumulados en la hoja Resumen General', () => {
    const vouchers = [
      makeVoucher(kFactura, '01', 100.0),
      makeVoucher(kFactura.replace(/1$/, '2'), '01', 200.0),
      makeVoucher(kRetencion, '07', 45.0),
    ];

    const xml = exportVouchersToExcelXml(vouchers);
    expect(xml).toContain('ss:Type="Number">300'); // Suma de Facturas
    expect(xml).toContain('ss:Type="Number">45');  // Suma de Retenciones
    expect(xml).toContain('ss:Type="Number">345'); // Total General
  });

  it('buildExcelFilename construye nombres estándar para Excel', () => {
    expect(buildExcelFilename('0190000000001', '2024-05')).toBe(
      'Kattxo/0190000000001/2024/05/reporte_comprobantes_0190000000001_2024-05.xls'
    );
    expect(buildExcelFilename('0190000000001')).toBe(
      'Kattxo/0190000000001/reporte_comprobantes_0190000000001.xls'
    );
  });
});
