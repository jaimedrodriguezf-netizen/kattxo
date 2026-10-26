# Feature: Conciliación y Auditoría de Completitud (Lote vs Reporte TXT SRI)

Motor y vistas para conciliar los comprobantes descargados en disco contra el reporte TXT oficial emitido por el SRI, detectando documentos faltantes por caídas de red, comprobantes huérfanos y discrepancias de importes monetarios, con opción directa de reintento automático de faltantes.

## Specs
- S1: Motor de conciliación (voucherReconciler.ts) que compara un conjunto de comprobantes esperados (desde reporte TXT del SRI) contra los comprobantes efectivamente descargados/procesados.
- S2: Clasificación de resultados en cuatro conjuntos: matched (completados y coincidentes), missing (faltantes en la descarga), orphans (descargados no listados en TXT) y amountDiscrepancies (diferencia de importe mayor a 0.005).
- S3: Cálculo de métricas agregadas de conciliación: tasa de completitud porcentual (%), total monetario esperado vs total monetario efectivamente descargado y diferencia neta.
- S4: Generador de reporte de conciliación en formato CSV estructurado para auditoría contable (reconciliationToCsv).
- S5: Integración en la interfaz de usuario: pantalla de éxito del widget in-page con botón para conciliar con TXT y pestaña en options.html para auditar cualquier lote previo con opción "⚡ Descargar Solo Faltantes".
- S6: Cobertura de pruebas unitarias automatizadas con Vitest para validar todos los casos límites (lotes 100% coincidentes, 100% faltantes, importes con diferencias de centavos, claves duplicadas).

## Tasks
- [x] T1 (S1, S2, S3): Implementar voucherReconciler.ts y pruebas unitarias exhaustivas en tests/voucherReconciler.test.ts. (3335562)
- [x] T2 (S4): Implementar función de exportación a CSV de la conciliación con tests unitarios. (3335562)
- [x] T3 (S5): Integrar acción de conciliación y botón de reintento de faltantes en InPageWidget y Options. (14fc024)
- [x] T4 (S6): Verificación completa de suite de pruebas unitarias y generación de build limpio en dist/. (3335562, 14fc024)

## Log
- L1: Usuario solicita: "vamos con todos uno por uno" tras auditoría técnica de funciones de TribuExcel (Modo Cargar Reporte TXT del SRI, Conciliación, Nomenclatura Configurable, Excel XLSX).
