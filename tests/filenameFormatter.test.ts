import { describe, it, expect } from 'vitest';
import { formatCustomFilename, sanitizeFilenamePart } from '../src/domain/filenameFormatter';

describe('filenameFormatter', () => {
  const sampleData = {
    tipo: 'factura',
    tipoCode: '01',
    clave: '1405202401019000000000120010010000001231234567818',
    ruc: '0190000000001',
    numero: '001-001-000000123',
    secuencial: '000000123',
    fecha: '2024-05-14',
    razonSocial: 'COMERCIAL ANDINA CÍA. LTDA. / S.A.',
  };

  it('aplica el patrón predeterminado {tipo}_{clave} si el patrón es vacío o nulo', () => {
    expect(formatCustomFilename('', sampleData)).toBe(`factura_${sampleData.clave}`);
    expect(formatCustomFilename(undefined, sampleData)).toBe(`factura_${sampleData.clave}`);
  });

  it('reemplaza tokens como {ruc}_{numero}', () => {
    const result = formatCustomFilename('{ruc}_{numero}', sampleData);
    expect(result).toBe('0190000000001_001-001-000000123');
  });

  it('reemplaza tokens combinados {fecha}_{tipo}_{numero}', () => {
    const result = formatCustomFilename('{fecha}_{tipo}_{numero}', sampleData);
    expect(result).toBe('2024-05-14_factura_001-001-000000123');
  });

  it('reemplaza token {razonSocial} y sanitiza caracteres inválidos de archivos (/, :, *, ?)', () => {
    const result = formatCustomFilename('{razonSocial}_{secuencial}', sampleData);
    expect(result).not.toContain('/');
    expect(result).not.toContain(':');
    expect(result).toContain('000000123');
  });

  it('sanitizeFilenamePart limpia espacios múltiples y caracteres peligrosos', () => {
    expect(sanitizeFilenamePart('EMPRESA / S.A. : <TEST>*?')).toBe('EMPRESA_S.A._TEST');
  });
});
