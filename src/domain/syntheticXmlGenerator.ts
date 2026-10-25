import { SriVoucher } from './types';

export interface SyntheticXmlItem {
  codigoPrincipal: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento?: number;
  precioTotalSinImpuesto?: number;
  impuestos?: Array<{
    codigo: string; // '2' para IVA, '3' para ICE
    codigoPorcentaje: string; // '4' para 15%, '2' para 12%, '0' para 0%
    tarifa: number;
    baseImponible: number;
    valor: number;
  }>;
}

export interface SyntheticXmlTaxTotal {
  codigo: string;
  codigoPorcentaje: string;
  baseImponible: number;
  valor: number;
  tarifa?: number;
}

export interface SyntheticXmlOptions {
  items?: SyntheticXmlItem[];
  taxTotals?: SyntheticXmlTaxTotal[];
  dirMatriz?: string;
  dirEstablecimiento?: string;
}

/**
 * Escapa caracteres reservados para formato XML.
 */
export function escapeXml(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Reconstruye el bloque <infoTributaria> del SRI a partir de la descomposición de la clave de acceso de 49 dígitos.
 */
export function buildInfoTributaria(voucher: SriVoucher, dirMatriz = 'Ecuador'): string {
  const key = voucher.claveAcceso.trim();
  const ambiente = key.length >= 24 ? key[23] : '2';
  const tipoEmision = key.length >= 48 ? key[47] : '1';
  const ruc = voucher.rucEmisor || (key.length >= 23 ? key.substring(10, 23) : '9999999999001');
  const codDoc = voucher.tipoComprobante || (key.length >= 10 ? key.substring(8, 10) : '01');
  const estab = key.length >= 27 ? key.substring(24, 27) : '001';
  const ptoEmi = key.length >= 30 ? key.substring(27, 30) : '001';
  const secuencial = key.length >= 39 ? key.substring(30, 39) : '000000001';
  const razonSocial = voucher.razonSocialEmisor || 'EMISOR SRI';

  return `\t<infoTributaria>
\t\t<ambiente>${escapeXml(ambiente)}</ambiente>
\t\t<tipoEmision>${escapeXml(tipoEmision)}</tipoEmision>
\t\t<razonSocial>${escapeXml(razonSocial)}</razonSocial>
\t\t<nombreComercial>${escapeXml(razonSocial)}</nombreComercial>
\t\t<ruc>${escapeXml(ruc)}</ruc>
\t\t<claveAcceso>${escapeXml(key)}</claveAcceso>
\t\t<codDoc>${escapeXml(codDoc)}</codDoc>
\t\t<estab>${escapeXml(estab)}</estab>
\t\t<ptoEmi>${escapeXml(ptoEmi)}</ptoEmi>
\t\t<secuencial>${escapeXml(secuencial)}</secuencial>
\t\t<dirMatriz>${escapeXml(dirMatriz)}</dirMatriz>
\t</infoTributaria>`;
}

/**
 * Construye el bloque <detalles> con productos, precios e impuestos.
 */
export function buildDetallesXml(items: SyntheticXmlItem[]): string {
  if (!items || items.length === 0) return '';
  const lines: string[] = ['\t<detalles>'];

  for (const item of items) {
    const cant = item.cantidad.toFixed(2);
    const pUnit = item.precioUnitario.toFixed(2);
    const desc = (item.descuento || 0).toFixed(2);
    const sinImp = (item.precioTotalSinImpuesto || item.cantidad * item.precioUnitario).toFixed(2);

    lines.push('\t\t<detalle>');
    lines.push(`\t\t\t<codigoPrincipal>${escapeXml(item.codigoPrincipal)}</codigoPrincipal>`);
    lines.push(`\t\t\t<descripcion>${escapeXml(item.descripcion)}</descripcion>`);
    lines.push(`\t\t\t<cantidad>${escapeXml(cant)}</cantidad>`);
    lines.push(`\t\t\t<precioUnitario>${escapeXml(pUnit)}</precioUnitario>`);
    lines.push(`\t\t\t<descuento>${escapeXml(desc)}</descuento>`);
    lines.push(`\t\t\t<precioTotalSinImpuesto>${escapeXml(sinImp)}</precioTotalSinImpuesto>`);

    if (item.impuestos && item.impuestos.length > 0) {
      lines.push('\t\t\t<impuestos>');
      for (const imp of item.impuestos) {
        lines.push('\t\t\t\t<impuesto>');
        lines.push(`\t\t\t\t\t<codigo>${escapeXml(imp.codigo)}</codigo>`);
        lines.push(`\t\t\t\t\t<codigoPorcentaje>${escapeXml(imp.codigoPorcentaje)}</codigoPorcentaje>`);
        lines.push(`\t\t\t\t\t<tarifa>${escapeXml(imp.tarifa.toFixed(2))}</tarifa>`);
        lines.push(`\t\t\t\t\t<baseImponible>${escapeXml(imp.baseImponible.toFixed(2))}</baseImponible>`);
        lines.push(`\t\t\t\t\t<valor>${escapeXml(imp.valor.toFixed(2))}</valor>`);
        lines.push('\t\t\t\t</impuesto>');
      }
      lines.push('\t\t\t</impuestos>');
    }
    lines.push('\t\t</detalle>');
  }

  lines.push('\t</detalles>');
  return lines.join('\n');
}

/**
 * Genera un archivo XML estándar del SRI para Comprobantes Emitidos, encapsulado en <autorizacion>.
 */
export function buildSyntheticSriXml(
  voucher: SriVoucher,
  options: SyntheticXmlOptions = {}
): string {
  const key = voucher.claveAcceso.trim();
  const isPruebas = key.length >= 24 && key[23] === '1';
  const ambienteLabel = isPruebas ? 'PRUEBAS' : 'PRODUCCIÓN';
  const fechaAut = voucher.fechaAutorizacion || voucher.fechaEmision || new Date().toLocaleDateString('es-EC');

  const infoTributaria = buildInfoTributaria(voucher, options.dirMatriz);

  let rootTag = 'factura';
  let version = '1.1.0';
  let bodyContent = '';

  const tipo = voucher.tipoComprobante;
  const total = voucher.totalImporte !== undefined ? voucher.totalImporte.toFixed(2) : '0.00';

  if (tipo === '07') {
    rootTag = 'comprobanteRetencion';
    version = '1.0.0';
    bodyContent = `\t<infoCompRetencion>
\t\t<fechaEmision>${escapeXml(voucher.fechaEmision)}</fechaEmision>
\t\t<dirEstablecimiento>${escapeXml(options.dirEstablecimiento || 'Ecuador')}</dirEstablecimiento>
\t\t<obligadoContabilidad>NO</obligadoContabilidad>
\t\t<tipoIdentificacionSujetoRetenido>${voucher.identificacionSujetoRetenido?.length === 13 ? '04' : '05'}</tipoIdentificacionSujetoRetenido>
\t\t<razonSocialSujetoRetenido>${escapeXml(voucher.razonSocialReceptor || voucher.razonSocialEmisor)}</razonSocialSujetoRetenido>
\t\t<identificacionSujetoRetenido>${escapeXml(voucher.identificacionSujetoRetenido || '9999999999999')}</identificacionSujetoRetenido>
\t\t<periodoFiscal>${escapeXml(voucher.fechaEmision.substring(3))}</periodoFiscal>
\t</infoCompRetencion>`;
  } else {
    // Factura por defecto (01)
    rootTag = 'factura';
    version = '1.1.0';
    const subtotal = total;
    const detallesXml = options.items && options.items.length > 0 ? `\n${buildDetallesXml(options.items)}` : '';
    bodyContent = `\t<infoFactura>
\t\t<fechaEmision>${escapeXml(voucher.fechaEmision)}</fechaEmision>
\t\t<dirEstablecimiento>${escapeXml(options.dirEstablecimiento || 'Ecuador')}</dirEstablecimiento>
\t\t<obligadoContabilidad>NO</obligadoContabilidad>
\t\t<tipoIdentificacionComprador>${voucher.identificacionSujetoRetenido?.length === 13 ? '04' : '05'}</tipoIdentificacionComprador>
\t\t<razonSocialComprador>${escapeXml(voucher.razonSocialReceptor || 'CONSUMIDOR FINAL')}</razonSocialComprador>
\t\t<identificacionComprador>${escapeXml(voucher.identificacionSujetoRetenido || '9999999999999')}</identificacionComprador>
\t\t<totalSinImpuestos>${escapeXml(subtotal)}</totalSinImpuestos>
\t\t<totalDescuento>0.00</totalDescuento>
\t\t<totalConImpuestos>
\t\t\t<totalImpuesto>
\t\t\t\t<codigo>2</codigo>
\t\t\t\t<codigoPorcentaje>4</codigoPorcentaje>
\t\t\t\t<baseImponible>${escapeXml(subtotal)}</baseImponible>
\t\t\t\t<valor>0.00</valor>
\t\t\t</totalImpuesto>
\t\t</totalConImpuestos>
\t\t<propina>0.00</propina>
\t\t<importeTotal>${escapeXml(total)}</importeTotal>
\t\t<moneda>DOLAR</moneda>
\t</infoFactura>${detallesXml}`;
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<!-- Este documento es un extracto estructurado generado por Kattxo SRI -->
<autorizacion>
\t<estado>AUTORIZADO</estado>
\t<numeroAutorizacion>${escapeXml(key)}</numeroAutorizacion>
\t<fechaAutorizacion>${escapeXml(fechaAut)}</fechaAutorizacion>
\t<ambiente>${escapeXml(ambienteLabel)}</ambiente>
\t<comprobante><![CDATA[<?xml version="1.0" encoding="utf-8"?>
<${rootTag} id="comprobante" version="${version}">
${infoTributaria}
${bodyContent}
</${rootTag}>
]]></comprobante>
</autorizacion>`;
}
