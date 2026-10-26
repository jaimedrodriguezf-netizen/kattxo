# Feature: Plantilla de Nomenclatura Configurable para Comprobantes SRI

Permite al usuario definir patrones personalizados de nombres de archivo para los XML y PDF descargados (ej. `{ruc}_{numero}`, `{fecha}_{tipo}_{numero}`, `{tipo}_{clave}`), con presets rápidos en la pantalla de configuración y vista previa dinámica.

## Specs
- S1: Motor de formateo de nombres (formatCustomFilename en downloadRouter.ts / filenameFormatter.ts) que reemplaza variables dinámicas ({tipo}, {tipoCode}, {clave}, {ruc}, {numero}, {secuencial}, {fecha}, {razonSocial}) sanitizando caracteres inválidos para sistemas de archivos (Windows/Mac/Linux).
- S2: Persistencia del patrón en UserPreferences (HistoryManager) con fallback al patrón predeterminado ('{tipo}_{clave}').
- S3: Integración en resolveDynamicDownloadPath para que el router de descargas en segundo plano aplique el patrón configurado respetando las extensiones (.xml, .pdf) y la estructura jerárquica de carpetas.
- S4: Interfaz en options.html (tab Configuración) con campo de texto editable, botones de presets comunes ('{tipo}_{clave}', '{ruc}_{numero}', '{fecha}_{ruc}_{numero}') y caja de vista previa en tiempo real.
- S5: Suite de pruebas unitarias automatizadas con Vitest cubriendo todos los tokens, sanitización de caracteres especiales y compatibilidad con carpetas.

## Tasks
- [x] T1 (S1, S2): Implementar formateador de nombres y persistencia en UserPreferences con tests unitarios. (4c26d0d)
- [x] T2 (S3): Integrar plantilla en resolveDynamicDownloadPath y background router con tests. (4c26d0d)
- [x] T3 (S4): Agregar campo de plantilla, presets y vista previa en options.html y OptionsController con tests. (4c26d0d)
- [x] T4 (S5): Verificación completa de suite de tests y build de producción en dist/. (4c26d0d)

## Log
- L1: Usuario solicita: "vamos con todos uno por uno" tras auditoría técnica de funciones de TribuExcel (Modo Cargar Reporte TXT del SRI, Conciliación, Nomenclatura Configurable, Excel XLSX).
