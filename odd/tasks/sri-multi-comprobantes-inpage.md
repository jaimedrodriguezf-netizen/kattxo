# Feature: Descarga Masiva Multi-Comprobante y Panel In-Page SRI

Extensión de navegador (Manifest V3) para descarga masiva de todos los tipos de comprobantes electrónicos del SRI en Línea (Ecuador) con panel flotante interactivo, automatización de consultas y organización jerárquica de descargas en disco.

## Specs
- S1: Soporte para los 6 tipos de comprobantes electrónicos del SRI: Facturas ('01'), Liquidaciones de Compra ('03'), Notas de Crédito ('04'), Notas de Débito ('05'), Guías de Remisión ('06') y Retenciones ('07').
- S2: Estructura de guardado organizada en disco mediante chrome.downloads: 'Kattxo/[RUC]/[Año]/[Mes]/[Tipo]/[Comprobante]_[Clave].xml' y opción para RIDE (PDF).
- S3: Detección automática del RUC y razón social del contribuyente autenticado en el portal SRI en Línea.
- S4: Parser universal para tablas de Comprobantes Recibidos y Comprobantes Emitidos en tecnología JSF Mojarra / RichFaces.
- S5: Automatización de formularios JSF: selección de período (año, mes, día), tipo de comprobante y disparo de consulta AJAX sin recarga total.
- S6: Recorrido y recolección automática de comprobantes en tablas paginadas (rich-datascr).
- S7: Panel flotante interactivo (In-Page UX) inyectado en Shadow DOM dentro del portal del SRI, con controles de inicio, pausa, progreso en vivo y métricas de descarga.
- S8: Suite de pruebas unitarias automatizadas con Vitest y build dual para Manifest V3.

## Tasks
- [x] T1 (S1, S2): Modelo de dominio universal (SriVoucher, SriDocumentType) y enrutador jerárquico de descargas en validators.ts con tests unitarios. (5e89150)
- [x] T2 (S3, S4): Detección de perfil de contribuyente y parser universal para comprobantes recibidos y emitidos con tests. (f44f9ea)
- [x] T3 (S5, S6): Motor de automatización de formularios JSF y paginador RichFaces en content script. (719fe1a)
- [x] T4 (S7): Componente de panel flotante In-Page (Shadow DOM) con barra de progreso, controles y canal de mensajería. (23cc05c)
- [x] T5 (S1, S2): Soporte opcional para descarga de RIDE (PDF) y orquestación en background worker. (de48337)
- [/] T6 (S8): Verificación integral, tests unitarios completos de la suite y build de producción en dist/. (inline)

## Log
- L1: Usuario solicita: "https://productos.tribuexcel.com/knowledge-base/descargar-comprobantes/, sabes usar rea tiene acceso a todas las herramiem5as de rea para replicar las funciones de esta url ?" seguido de "ok hagamos un plan de implementacion de las nuevas funciones" y "ok dale".
