# Feature: Exportador a Excel Nativo con Hojas Múltiples y Desglose Impositivo

Generador de libros de Excel estructurados en formato SpreadsheetML con múltiples pestañas (Resumen General, Facturas, Retenciones, Notas de Crédito y Todos los Comprobantes), estilos visuales contables, celdas tipadas (String vs Number) y cálculo de totales acumulados.

## Specs
- S1: Generador Excel SpreadsheetML (excelSpreadsheetGenerator.ts) que produce un documento XML con esquema oficial urn:schemas-microsoft-com:office:spreadsheet, legible directamente por Microsoft Excel, LibreOffice Calc y Google Sheets.
- S2: Definición de estilos profesionales en el libro: cabeceras con color corporativo (#0C4597), texto blanco en negrita, celdas numéricas con formato de moneda $#,##0.00 y celdas de RUC/clave forzadas a texto para evitar pérdida de ceros a la izquierda.
- S3: Estructura multi-hoja inteligente:
  - Hoja "Resumen": tabla pivote de totales por tipo de comprobante (conteo de documentos y suma monetaria total).
  - Hoja "Facturas": detalle de facturas con columnas de RUC, razón social, fecha, número, total y clave de acceso.
  - Hoja "Retenciones": detalle de comprobantes de retención.
  - Hoja "Todos los Comprobantes": consolidado general con tipo, número, importes y estado.
- S4: Integración en la interfaz de usuario: botón "📗 Exportar Excel" en el Widget In-Page (InPageWidget) y en la página de opciones (options.html).
- S5: Suite de pruebas unitarias automatizadas con Vitest que valida la estructura XML del libro, formato de celdas, suma de importes y partición en hojas.

## Tasks
- [x] T1 (S1, S2, S3): Implementar excelSpreadsheetGenerator.ts y suite de pruebas en tests/excelSpreadsheetGenerator.test.ts. (6a3d9e4)
- [x] T2 (S4): Integrar botón y acción de exportación a Excel en InPageWidget y content/index.ts con tests. (6a3d9e4)
- [x] T3 (S4): Integrar acción de exportación a Excel en options.html y OptionsController con tests. (6a3d9e4)
- [x] T4 (S5): Verificación completa de suite de tests y build de producción limpio en dist/. (6a3d9e4)

## Log
- L1: Usuario solicita: "vamos con todos uno por uno" tras auditoría técnica de funciones de TribuExcel (Modo Cargar Reporte TXT del SRI, Conciliación, Nomenclatura Configurable, Excel XLSX).
