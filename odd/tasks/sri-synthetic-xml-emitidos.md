# Feature: Generador de XML Sintético para Comprobantes Emitidos SRI

Generación de archivos XML conformes al esquema estándar del SRI para Comprobantes Emitidos (ventas), permitiendo a contadores y sistemas contables procesar las ventas en formato XML aun cuando el portal del SRI no ofrece botón de descarga directa de XML firmado para emitidos.

## Specs
- S1: Generador sintético de XML tributario (syntheticXmlGenerator.ts) que construye la estructura oficial <autorizacion> con CDATA y comprobante (<factura>, <comprobanteRetencion>, etc.) conforme al esquema del SRI.
- S2: Reconstrucción de <infoTributaria> a partir de la descomposición de la clave de acceso de 49 dígitos (RUC emisor, establecimiento, punto emisión, secuencial, ambiente, tipo emisión).
- S3: Inclusión de <infoFactura> y <detalles> de productos/impuestos con soporte para tarifas de IVA estándar del Ecuador (15%, 12%, 5%, 0%).
- S4: Integración en el content script para generar y descargar el XML sintético en Comprobantes Emitidos cuando el formato seleccionado es XML.
- S5: Suite de pruebas unitarias automatizadas con Vitest para validar la estructura XML generada, escapado de caracteres especiales y compatibilidad con lectores contables.

## Tasks
- T1 (S1, S2): Módulo syntheticXmlGenerator.ts con generador de infoTributaria, autorizacion y comprobante con tests unitarios. (inline)
- T2 (S3): Soporte de detalles de productos, totales por impuesto y tarifas de IVA en syntheticXmlGenerator.ts con tests. (inline)
- T3 (S4): Integración de descarga de XML sintético para comprobantes emitidos en content/index.ts. (inline)
- T4 (S5): Verificación integral, tests completos de la suite y build de producción en dist/. (inline)

## Log
- L1: Usuario confirma: "ok hazlo" para implementar el generador de XML sintético para comprobantes emitidos.
