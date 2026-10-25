# Feature: Compatibilidad Dual SRI (Emitidos & Recibidos) y Enrutamiento Contable

Soporte completo para las dos pantallas principales del portal SRI en Línea: Comprobantes Recibidos (selectores JSF de año/mes/día) y Comprobantes Emitidos (calendarFechaDesde_input / calendarFechaHasta_input en DD/MM/YYYY), con separación contable de descargas en carpetas Recibidos/ y Emitidos/.

## Specs
- S1: Soporte en formAutomator.ts para detectar y rellenar 'frmPrincipal:calendarFechaDesde_input' y 'frmPrincipal:calendarFechaHasta_input' en formato DD/MM/YYYY en la vista de emitidos.
- S2: Adaptación de BatchQueryRunner para enviar parámetros de fecha formateados (DD/MM/YYYY) tanto a formularios de calendario como a dropdowns tradicionales.
- S3: Enrutador de descargas (validators.ts y downloadRouter.ts) con separación jerárquica: 'Kattxo/Recibidos/[RUC]/...' vs 'Kattxo/Emitidos/[RUC]/...'.
- S4: Detección automática en el content script de la categoría de página (/recibidos/ vs /emitidos/) para etiquetar los comprobantes extraídos.
- S5: Suite de pruebas unitarias automatizadas con Vitest para el llenado de inputs de calendario y las rutas contables segregadas.

## Tasks
- [x] T1 (S1): Lógica de inputs de calendario (calendarFechaDesde / calendarFechaHasta) en formAutomator.ts con tests unitarios. (6aaa056)
- [x] T2 (S2, S4): Adaptación de BatchQueryRunner y content/index.ts para envío dual de fechas y detección de página con tests. (f528255)
- [/] T3 (S3): Enrutamiento jerárquico segregado por Recibidos/Emitidos en validators.ts y downloadRouter.ts con tests. (inline)
- T4 (S5): Verificación integral, tests de la suite completa y build de producción en dist/. (inline)

## Log
- L1: Usuario confirma: "si dale" para implementar la compatibilidad dual con Comprobantes Emitidos y la separación contable en carpetas.
