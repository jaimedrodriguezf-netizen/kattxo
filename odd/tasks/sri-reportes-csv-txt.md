# Feature: Exportador CSV/Excel y Reporte TXT Oficial del SRI

Generación de reportes tabulares de comprobantes en formato CSV compatible con Excel y automatización de la descarga del reporte TXT oficial del portal SRI en Línea.

## Specs
- S1: Generador de CSV en formato UTF-8 con BOM y delimitador estándar para Excel en español (punto y coma ';'), conteniendo: Fecha Emisión, Código Tipo, Tipo Comprobante, RUC Emisor, Razón Social Emisor, Identificación Receptor, Razón Social Receptor, Número Comprobante, Clave de Acceso y Estado.
- S2: Automatización de la descarga del reporte TXT nativo del portal SRI en Línea localizando y disparando el enlace 'frmPrincipal:lnkTxtlistado' o equivalente.
- S3: Integración de botones de exportación en el widget flotante in-page (Shadow DOM) y en el popup de la extensión.
- S4: Enrutamiento de guardado del reporte CSV en disco mediante chrome.downloads siguiendo la estructura 'Kattxo/[RUC]/[Año]/[Mes]/reporte_comprobantes_[RUC]_[periodo].csv'.
- S5: Suite de pruebas unitarias automatizadas con Vitest para el formateador CSV y el disparador de reporte TXT.

## Tasks
- [x] T1 (S1, S4): Módulo de exportación CSV (csvExporter.ts) con tipado, BOM UTF-8, sanitización de comillas y tests unitarios. (47a081e)
- [x] T2 (S2): Disparador y extractor del reporte TXT oficial del SRI en formAutomator.ts con tests. (47a081e)
- [x] T3 (S3): Integración de botones 'Exportar CSV' y 'Descargar TXT SRI' en InPageWidget y Popup UI. (d4632a2)
- [x] T4 (S5): Verificación integral, tests de la suite completa y build de producción en dist/. (47a081e, d4632a2)

## Log
- L1: Usuario selecciona: "1. Exportador CSV/Excel + Reporte TXT del SRI (value: kattxo_excel_txt)".
