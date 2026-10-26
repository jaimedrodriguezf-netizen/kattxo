# Feature: Cargar Reporte TXT del SRI para Descarga Desatendida

Módulo para importar archivos TXT de reportes oficiales emitidos por el SRI en Línea (Recibidos y Emitidos), extrayendo automáticamente las claves de acceso de 49 dígitos y metadatos contables para encolar descargas masivas de XML y PDF de forma desatendida sin depender de la navegación manual por páginas JSF.

## Specs
- S1: Parser robusto de reportes TXT del SRI (sriTxtParser.ts) capaz de procesar archivos tabulados (Tab-delimited) y delimitados por punto y coma, ignorando encabezados y extrayendo claves de acceso de 49 dígitos, RUC emisor, razón social, fecha, número de comprobante, tipo de comprobante, importe y estado.
- S2: Normalización y clasificación automática de comprobantes extraídos del TXT (recibidos vs emitidos) asignando valores por defecto confiables a partir de la descomposición de la clave de acceso de 49 dígitos.
- S3: Integración visual en el Widget In-Page (InPageWidget) con botón y zona para "📄 Cargar TXT del SRI", permitiendo seleccionar o arrastrar un archivo .txt y visualizando la cantidad de comprobantes detectados.
- S4: Integración en la página de opciones (options.html / options/controller.ts) con panel para cargar TXT e iniciar la descarga en segundo plano o registrar el lote.
- S5: Conexión con el motor de descargas para procesar la lista importada desde TXT tanto para Comprobantes Recibidos (descarga directa) como Emitidos (generación de XML sintético).
- S6: Suite exhaustiva de pruebas unitarias con Vitest para validar diferentes variaciones del formato TXT del SRI (con/sin BOM, variaciones de columnas, líneas vacías, valores monetarios con coma o punto).

## Tasks
- [x] T1 (S1, S2): Implementar sriTxtParser.ts con parseSriTxtReport() y pruebas unitarias en tests/sriTxtParser.test.ts. (0c38e15)
- [x] T2 (S3): Agregar control visual de carga de archivo TXT y estado en InPageWidget con tests. (4c00242)
- [x] T3 (S4, S5): Conectar el flujo de importación de TXT con startBulkDownload en content/index.ts y en options. (4c00242)
- [x] T4 (S6): Verificación de suite completa de pruebas unitarias y generación de build limpio en dist/. (0c38e15, 4c00242)

## Log
- L1: Usuario solicita: "vamos con todos uno por uno" tras auditoría técnica de funciones de TribuExcel (Modo Cargar Reporte TXT del SRI, Conciliación, Nomenclatura Configurable, Excel XLSX).
