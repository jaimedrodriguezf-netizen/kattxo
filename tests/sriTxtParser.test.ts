import { describe, it, expect } from 'vitest';
import { parseSriTxtReport } from '../src/domain/sriTxtParser';

describe('sriTxtParser', () => {
  const sampleKey1 = '1405202401019000000000120010010000001231234567818';
  const sampleKey2 = '1505202407179000000000120020020000004568765432115';

  it('debe parsear un reporte TXT estándar del SRI tabulado con encabezados', () => {
    const txtContent = [
      'RUC del Emisor\tRazón Social\tTipo de Comprobante\tNúmero de Comprobante\tClave de Acceso\tFecha de Emisión\tFecha de Autorización\tSubtotal\tIVA\tImporte Total\tEstado',
      `0190000000001\tCOMERCIAL ANDINA CIA. LTDA.\tFactura\t001-001-000000123\t${sampleKey1}\t14/05/2024\t14/05/2024 10:15\t100.00\t15.00\t115.00\tAUTORIZADO`,
      `1790000000001\tSERVICIOS TRIBUTARIOS S.A.\tComprobante de Retención\t002-002-000000456\t${sampleKey2}\t15/05/2024\t15/05/2024 16:30\t50.00\t0.00\t50.00\tAUTORIZADO`,
    ].join('\r\n');

    const result = parseSriTxtReport(txtContent);

    expect(result).toHaveLength(2);
    expect(result[0].claveAcceso).toBe(sampleKey1);
    expect(result[0].rucEmisor).toBe('0190000000001');
    expect(result[0].razonSocialEmisor).toBe('COMERCIAL ANDINA CIA. LTDA.');
    expect(result[0].numeroComprobante).toBe('001-001-000000123');
    expect(result[0].tipoComprobante).toBe('01');
    expect(result[0].totalImporte).toBe(115.0);
    expect(result[0].estado).toBe('AUTORIZADO');
    expect(result[0].fechaEmision).toBe('14/05/2024');

    expect(result[1].claveAcceso).toBe(sampleKey2);
    expect(result[1].tipoComprobante).toBe('07');
    expect(result[1].totalImporte).toBe(50.0);
  });

  it('debe manejar BOM UTF-8 y saltos de línea unix (\\n)', () => {
    const txtContent = `\uFEFFRUC\tNombre\tTipo\tNúmero\tClave\tFecha\tTotal\tEstado\n0190000000001\tEMPRESA A\tFactura\t001-001-000000123\t${sampleKey1}\t14/05/2024\t150.50\tAUTORIZADO\n`;

    const result = parseSriTxtReport(txtContent);
    expect(result).toHaveLength(1);
    expect(result[0].claveAcceso).toBe(sampleKey1);
    expect(result[0].totalImporte).toBe(150.5);
  });

  it('debe extraer metadatos intrínsecos de la clave de 49 dígitos si faltan columnas', () => {
    const rawLines = `Linea de basura\n${sampleKey1}\n`;
    const result = parseSriTxtReport(rawLines);
    expect(result).toHaveLength(1);
    expect(result[0].claveAcceso).toBe(sampleKey1);
    expect(result[0].tipoComprobante).toBe('01');
    expect(result[0].rucEmisor).toBe('0190000000001');
    expect(result[0].numeroComprobante).toBe('001-001-000000123');
  });

  it('debe descartar duplicados manteniendo la primera ocurrencia con datos completos', () => {
    const txtContent = [
      `0190000000001\tEMPRESA A\tFactura\t001-001-000000123\t${sampleKey1}\t14/05/2024\t100.00\tAUTORIZADO`,
      `0190000000001\tEMPRESA A DUPLICADA\tFactura\t001-001-000000123\t${sampleKey1}\t14/05/2024\t100.00\tAUTORIZADO`,
    ].join('\n');

    const result = parseSriTxtReport(txtContent);
    expect(result).toHaveLength(1);
    expect(result[0].razonSocialEmisor).toBe('EMPRESA A');
  });

  it('debe respetar la categoría indicada o deducirla', () => {
    const resultEmitidos = parseSriTxtReport(sampleKey1, 'emitidos');
    expect(resultEmitidos[0].categoria).toBe('emitidos');

    const resultRecibidos = parseSriTxtReport(sampleKey1, 'recibidos');
    expect(resultRecibidos[0].categoria).toBe('recibidos');
  });

  it('debe manejar importes con formato europeo o coma decimal y valores en cero', () => {
    const line = `0190000000001\tPROVEEDOR XYZ\tFactura\t001-001-000000999\t${sampleKey1}\t14/05/2024\t1.250,50\tAUTORIZADO`;
    const result = parseSriTxtReport(line);
    expect(result).toHaveLength(1);
    expect(result[0].totalImporte).toBe(1250.5);
  });

  it('debe tolerar archivos delimitados por punto y coma y líneas vacías', () => {
    const content = `\n\n0190000000001;COMERCIAL DEL VALLE;Factura;001-001-000000123;${sampleKey1};14/05/2024;14/05/2024;45.20;AUTORIZADO\n\n`;
    const result = parseSriTxtReport(content);
    expect(result).toHaveLength(1);
    expect(result[0].razonSocialEmisor).toBe('COMERCIAL DEL VALLE');
    expect(result[0].totalImporte).toBe(45.2);
  });

  it('debe retornar arreglo vacío ante entradas nulas o vacías', () => {
    expect(parseSriTxtReport('')).toEqual([]);
    expect(parseSriTxtReport('   \n\t  ')).toEqual([]);
  });
});
