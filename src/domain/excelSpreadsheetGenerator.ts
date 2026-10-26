import { SriVoucher, TaxpayerProfile } from './types';
import { getSriDocumentTypeName } from './validators';

/**
 * Escapa caracteres reservados en XML para contenido de texto en celdas de Excel.
 */
function escapeXml(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Genera la definición de estilos de celda SpreadsheetML de Excel.
 */
function getSpreadsheetStyles(): string {
  return `
    <Styles>
      <Style ss:ID="Default" ss:Name="Normal">
        <Alignment ss:Vertical="Center"/>
        <Borders/>
        <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
        <Interior/>
        <NumberFormat/>
        <Protection/>
      </Style>
      <Style ss:ID="sHeader">
        <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
        <Borders>
          <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
          <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
          <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
          <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
        </Borders>
        <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
        <Interior ss:Color="#0C4597" ss:Pattern="Solid"/>
      </Style>
      <Style ss:ID="sTitle">
        <Font ss:FontName="Calibri" ss:Size="14" ss:Color="#0C4597" ss:Bold="1"/>
      </Style>
      <Style ss:ID="sSubTitle">
        <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#555555" ss:Italic="1"/>
      </Style>
      <Style ss:ID="sCurrency">
        <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
        <Borders>
          <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
          <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
          <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
          <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
        </Borders>
        <NumberFormat ss:Format="$#,##0.00"/>
      </Style>
      <Style ss:ID="sInteger">
        <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
        <Borders>
          <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
          <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
          <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
          <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
        </Borders>
        <NumberFormat ss:Format="#,##0"/>
      </Style>
      <Style ss:ID="sText">
        <Borders>
          <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
          <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
          <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
          <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
        </Borders>
        <NumberFormat ss:Format="@"/>
      </Style>
      <Style ss:ID="sTotalRow">
        <Borders>
          <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#000000"/>
          <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
        </Borders>
        <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/>
        <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
      </Style>
      <Style ss:ID="sTotalCurrency">
        <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
        <Borders>
          <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#000000"/>
          <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
        </Borders>
        <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/>
        <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
        <NumberFormat ss:Format="$#,##0.00"/>
      </Style>
    </Styles>
  `;
}

/**
 * Construye una fila de datos de comprobante para las hojas de detalle.
 */
function buildVoucherRowXml(v: SriVoucher): string {
  const total = v.totalImporte !== undefined ? v.totalImporte : 0;
  return `
    <Row>
      <Cell ss:StyleID="sText"><Data ss:Type="String">${escapeXml(v.fechaEmision)}</Data></Cell>
      <Cell ss:StyleID="sText"><Data ss:Type="String">${escapeXml(v.tipoComprobante)}</Data></Cell>
      <Cell ss:StyleID="sText"><Data ss:Type="String">${escapeXml(getSriDocumentTypeName(v.tipoComprobante))}</Data></Cell>
      <Cell ss:StyleID="sText"><Data ss:Type="String">${escapeXml(v.rucEmisor)}</Data></Cell>
      <Cell ss:StyleID="sText"><Data ss:Type="String">${escapeXml(v.razonSocialEmisor)}</Data></Cell>
      <Cell ss:StyleID="sText"><Data ss:Type="String">${escapeXml(v.identificacionSujetoRetenido || '')}</Data></Cell>
      <Cell ss:StyleID="sText"><Data ss:Type="String">${escapeXml(v.razonSocialReceptor || '')}</Data></Cell>
      <Cell ss:StyleID="sText"><Data ss:Type="String">${escapeXml(v.numeroComprobante)}</Data></Cell>
      <Cell ss:StyleID="sCurrency"><Data ss:Type="Number">${total}</Data></Cell>
      <Cell ss:StyleID="sText"><Data ss:Type="String">${escapeXml(v.claveAcceso)}</Data></Cell>
      <Cell ss:StyleID="sText"><Data ss:Type="String">${escapeXml(v.estado || 'AUTORIZADO')}</Data></Cell>
    </Row>
  `;
}

/**
 * Construye una hoja de cálculo con detalle de comprobantes.
 */
function buildDetailWorksheet(sheetName: string, vouchers: SriVoucher[]): string {
  const headerCols = [
    'Fecha Emisión',
    'Tipo',
    'Descripción Tipo',
    'RUC Emisor',
    'Razón Social Emisor',
    'ID Receptor',
    'Razón Social Receptor',
    'Número Comprobante',
    'Total Importe',
    'Clave de Acceso',
    'Estado',
  ];

  const headerRow = `
    <Row ss:Height="24">
      ${headerCols.map((c) => `<Cell ss:StyleID="sHeader"><Data ss:Type="String">${escapeXml(c)}</Data></Cell>`).join('')}
    </Row>
  `;

  const dataRows = vouchers.map(buildVoucherRowXml).join('');
  const sumTotal = vouchers.reduce((acc, v) => acc + (v.totalImporte || 0), 0);

  const totalRow = `
    <Row ss:Height="20">
      <Cell ss:StyleID="sTotalRow"><Data ss:Type="String">TOTAL</Data></Cell>
      <Cell ss:StyleID="sTotalRow"/>
      <Cell ss:StyleID="sTotalRow"/>
      <Cell ss:StyleID="sTotalRow"/>
      <Cell ss:StyleID="sTotalRow"/>
      <Cell ss:StyleID="sTotalRow"/>
      <Cell ss:StyleID="sTotalRow"/>
      <Cell ss:StyleID="sTotalRow"><Data ss:Type="String">${vouchers.length} docs</Data></Cell>
      <Cell ss:StyleID="sTotalCurrency"><Data ss:Type="Number">${sumTotal}</Data></Cell>
      <Cell ss:StyleID="sTotalRow"/>
      <Cell ss:StyleID="sTotalRow"/>
    </Row>
  `;

  return `
    <Worksheet ss:Name="${escapeXml(sheetName)}">
      <Table ss:DefaultRowHeight="18">
        <Column ss:Width="80"/>
        <Column ss:Width="40"/>
        <Column ss:Width="110"/>
        <Column ss:Width="100"/>
        <Column ss:Width="200"/>
        <Column ss:Width="100"/>
        <Column ss:Width="200"/>
        <Column ss:Width="120"/>
        <Column ss:Width="90"/>
        <Column ss:Width="300"/>
        <Column ss:Width="90"/>
        ${headerRow}
        ${dataRows}
        ${totalRow}
      </Table>
    </Worksheet>
  `;
}

/**
 * Convierte un arreglo de comprobantes en un libro de Excel (.xls) estructurado
 * en formato SpreadsheetML (XML Spreadsheet 2003) con múltiples pestañas y estilos.
 */
export function exportVouchersToExcelXml(
  vouchers: SriVoucher[],
  taxpayerProfile?: TaxpayerProfile
): string {
  const groups: Record<string, SriVoucher[]> = {
    '01': [],
    '07': [],
    '04': [],
    '05': [],
    '03': [],
    '06': [],
  };

  let grandTotalAmount = 0;
  for (const v of vouchers) {
    const code = v.tipoComprobante || '01';
    if (!groups[code]) groups[code] = [];
    groups[code].push(v);
    grandTotalAmount += v.totalImporte !== undefined ? v.totalImporte : 0;
  }

  // Hoja 1: Resumen General
  const resumenRows = Object.keys(groups)
    .filter((code) => groups[code].length > 0)
    .map((code) => {
      const list = groups[code];
      const sum = list.reduce((acc, curr) => acc + (curr.totalImporte || 0), 0);
      return `
        <Row>
          <Cell ss:StyleID="sText"><Data ss:Type="String">${escapeXml(code)}</Data></Cell>
          <Cell ss:StyleID="sText"><Data ss:Type="String">${escapeXml(getSriDocumentTypeName(code))}</Data></Cell>
          <Cell ss:StyleID="sInteger"><Data ss:Type="Number">${list.length}</Data></Cell>
          <Cell ss:StyleID="sCurrency"><Data ss:Type="Number">${sum}</Data></Cell>
        </Row>
      `;
    })
    .join('');

  const now = new Date().toLocaleString();
  const rucLabel = taxpayerProfile?.ruc ? `RUC: ${taxpayerProfile.ruc}` : '';
  const nameLabel = taxpayerProfile?.razonSocial ? ` - ${taxpayerProfile.razonSocial}` : '';

  const sheetResumen = `
    <Worksheet ss:Name="Resumen General">
      <Table ss:DefaultRowHeight="18">
        <Column ss:Width="60"/>
        <Column ss:Width="160"/>
        <Column ss:Width="100"/>
        <Column ss:Width="130"/>
        <Row ss:Height="26">
          <Cell ss:StyleID="sTitle"><Data ss:Type="String">REPORTE CONSOLIDADO DE COMPROBANTES SRI</Data></Cell>
        </Row>
        <Row ss:Height="18">
          <Cell ss:StyleID="sSubTitle"><Data ss:Type="String">${escapeXml(`${rucLabel}${nameLabel} | Generado: ${now}`)}</Data></Cell>
        </Row>
        <Row ss:Height="10"/>
        <Row ss:Height="22">
          <Cell ss:StyleID="sHeader"><Data ss:Type="String">Código</Data></Cell>
          <Cell ss:StyleID="sHeader"><Data ss:Type="String">Tipo Comprobante</Data></Cell>
          <Cell ss:StyleID="sHeader"><Data ss:Type="String">Cantidad Docs</Data></Cell>
          <Cell ss:StyleID="sHeader"><Data ss:Type="String">Total Importe</Data></Cell>
        </Row>
        ${resumenRows}
        <Row ss:Height="22">
          <Cell ss:StyleID="sTotalRow"><Data ss:Type="String">TOTAL</Data></Cell>
          <Cell ss:StyleID="sTotalRow"><Data ss:Type="String">CONSOLIDADO GENERAL</Data></Cell>
          <Cell ss:StyleID="sTotalRow"><Data ss:Type="Number">${vouchers.length}</Data></Cell>
          <Cell ss:StyleID="sTotalCurrency"><Data ss:Type="Number">${grandTotalAmount}</Data></Cell>
        </Row>
      </Table>
    </Worksheet>
  `;

  // Hojas de detalle
  const sheetFacturas = buildDetailWorksheet('Facturas', groups['01']);
  const sheetRetenciones = buildDetailWorksheet('Retenciones', groups['07']);
  const sheetNotasCredito = groups['04'].length > 0 ? buildDetailWorksheet('Notas de Crédito', groups['04']) : '';
  const sheetTodos = buildDetailWorksheet('Todos los Comprobantes', vouchers);

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
  <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
    <Author>Kattxo SRI Extension</Author>
    <Created>${new Date().toISOString()}</Created>
    <Company>Kattxo</Company>
  </DocumentProperties>
  ${getSpreadsheetStyles()}
  ${sheetResumen}
  ${sheetFacturas}
  ${sheetRetenciones}
  ${sheetNotasCredito}
  ${sheetTodos}
</Workbook>`;
}

/**
 * Genera el nombre de archivo sugerido para el libro de Excel.
 */
export function buildExcelFilename(taxpayerRuc: string, period?: string): string {
  const cleanRuc = (taxpayerRuc || 'SRI').trim() || 'SRI';

  if (!period || !period.trim()) {
    return `Kattxo/${cleanRuc}/reporte_comprobantes_${cleanRuc}.xls`;
  }

  const cleanPeriod = period.trim();
  const yearMonthMatch = cleanPeriod.match(/^(\d{4})[-/](\d{1,2})$/);
  if (yearMonthMatch) {
    const year = yearMonthMatch[1];
    const month = yearMonthMatch[2].padStart(2, '0');
    return `Kattxo/${cleanRuc}/${year}/${month}/reporte_comprobantes_${cleanRuc}_${year}-${month}.xls`;
  }

  const yearMatch = cleanPeriod.match(/^(\d{4})$/);
  if (yearMatch) {
    const year = yearMatch[1];
    return `Kattxo/${cleanRuc}/${year}/reporte_comprobantes_${cleanRuc}_${year}.xls`;
  }

  const safePeriod = cleanPeriod.replace(/[\\/]+/g, '_');
  return `Kattxo/${cleanRuc}/reporte_comprobantes_${cleanRuc}_${safePeriod}.xls`;
}
