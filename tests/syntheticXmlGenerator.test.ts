import { describe, it, expect } from 'vitest';
import {
  escapeXml,
  buildInfoTributaria,
  buildSyntheticSriXml,
  SyntheticXmlItem,
} from '../src/domain/syntheticXmlGenerator';
import { SriVoucher } from '../src/domain/types';

describe('Synthetic SRI XML Generator (for Comprobantes Emitidos)', () => {
  const sampleFactura: SriVoucher = {
    claveAcceso: '1508202401179001122300120010020000000451234567812',
    tipoComprobante: '01',
    rucEmisor: '1790011223001',
    razonSocialEmisor: 'EMPRESA EMISORA S.A.',
    numeroComprobante: '001-002-000000045',
    fechaEmision: '15/08/2024',
    fechaAutorizacion: '15/08/2024 14:30:00',
    identificacionSujetoRetenido: '1712345678',
    razonSocialReceptor: 'CLIENTE FINAL CIA. LTDA.',
    categoria: 'emitidos',
    totalImporte: 125.5,
  };

  describe('escapeXml', () => {
    it('escapes &, <, >, ", and apostrophe properly', () => {
      expect(escapeXml('A & B < C > "D" \'E\'')).toBe('A &amp; B &lt; C &gt; &quot;D&quot; &apos;E&apos;');
    });

    it('returns empty string for null or undefined safely', () => {
      expect(escapeXml(null)).toBe('');
      expect(escapeXml(undefined)).toBe('');
    });
  });

  describe('buildInfoTributaria', () => {
    it('decomposes clave de acceso into accurate XML tags', () => {
      const xml = buildInfoTributaria(sampleFactura);
      expect(xml).toContain('<ambiente>2</ambiente>');
      expect(xml).toContain('<tipoEmision>1</tipoEmision>');
      expect(xml).toContain('<razonSocial>EMPRESA EMISORA S.A.</razonSocial>');
      expect(xml).toContain('<ruc>1790011223001</ruc>');
      expect(xml).toContain('<claveAcceso>1508202401179001122300120010020000000451234567812</claveAcceso>');
      expect(xml).toContain('<codDoc>01</codDoc>');
      expect(xml).toContain('<estab>001</estab>');
      expect(xml).toContain('<ptoEmi>002</ptoEmi>');
      expect(xml).toContain('<secuencial>000000045</secuencial>');
    });
  });

  describe('buildSyntheticSriXml', () => {
    it('generates valid autorizacion root with CDATA wrapper and standard factura', () => {
      const xml = buildSyntheticSriXml(sampleFactura);
      expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"')).toBe(true);
      expect(xml).toContain('<autorizacion>');
      expect(xml).toContain('<estado>AUTORIZADO</estado>');
      expect(xml).toContain('<numeroAutorizacion>1508202401179001122300120010020000000451234567812</numeroAutorizacion>');
      expect(xml).toContain('<comprobante><![CDATA[');
      expect(xml).toContain('<factura id="comprobante" version="1.1.0">');
      expect(xml).toContain('<infoTributaria>');
      expect(xml).toContain('<infoFactura>');
      expect(xml).toContain('<fechaEmision>15/08/2024</fechaEmision>');
      expect(xml).toContain('<razonSocialComprador>CLIENTE FINAL CIA. LTDA.</razonSocialComprador>');
      expect(xml).toContain('<importeTotal>125.50</importeTotal>');
      expect(xml).toContain(']]></comprobante>');
    });

    it('generates retencion root for document type 07', () => {
      const retencion: SriVoucher = {
        ...sampleFactura,
        tipoComprobante: '07',
        claveAcceso: '1508202407179001122300120010020000000451234567812',
      };
      const xml = buildSyntheticSriXml(retencion);
      expect(xml).toContain('<comprobanteRetencion id="comprobante" version="1.0.0">');
      expect(xml).toContain('<codDoc>07</codDoc>');
    });

    it('renders <detalles> and <totalConImpuestos> when items and taxes are provided', () => {
      const items: SyntheticXmlItem[] = [
        {
          codigoPrincipal: 'SRV-001',
          descripcion: 'DESARROLLO DE SOFTWARE',
          cantidad: 2,
          precioUnitario: 50.0,
          descuento: 0,
          precioTotalSinImpuesto: 100.0,
          impuestos: [
            {
              codigo: '2',
              codigoPorcentaje: '4', // 15% IVA Ecuador
              tarifa: 15.0,
              baseImponible: 100.0,
              valor: 15.0,
            },
          ],
        },
      ];

      const xml = buildSyntheticSriXml(sampleFactura, { items });
      expect(xml).toContain('<detalles>');
      expect(xml).toContain('<codigoPrincipal>SRV-001</codigoPrincipal>');
      expect(xml).toContain('<descripcion>DESARROLLO DE SOFTWARE</descripcion>');
      expect(xml).toContain('<cantidad>2.00</cantidad>');
      expect(xml).toContain('<precioUnitario>50.00</precioUnitario>');
      expect(xml).toContain('<precioTotalSinImpuesto>100.00</precioTotalSinImpuesto>');
      expect(xml).toContain('<codigoPorcentaje>4</codigoPorcentaje>');
      expect(xml).toContain('<tarifa>15.00</tarifa>');
      expect(xml).toContain('</detalles>');
    });
  });
});
