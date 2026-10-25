# Feature: Historial de Descargas y Configuración (options.html)

Página de opciones del sistema Kattxo SRI (options.html) con registro histórico persistente de descargas, reanudación automática de tareas incompletas y configuración de carpetas y throttling.

## Specs
- S1: Registro de 'options_ui' en manifest.json con 'open_in_tab: true' y bundle multi-entry en vite.config.ts.
- S2: Módulo gestor de historial (historyManager.ts) para almacenar sesiones en chrome.storage.local con timestamp, RUC, fechas, comprobantes completados/fallidos y claves pendientes.
- S3: Mecanismo de reanudación: re-encolar únicamente comprobantes no completados o fallidos de una sesión anterior.
- S4: Configuración de usuario: carpeta base de descarga (por defecto 'Kattxo') y retardo de throttling en milisegundos.
- S5: Vista visual options.html moderna y responsiva con tarjetas de historial, estadísticas acumuladas y panel de configuración.
- S6: Pruebas unitarias completas con Vitest para el gestor de historial y preferencias.

## Tasks
- [x] T1 (S2): Modelo de datos de historial y módulo historyManager.ts con pruebas unitarias. (4706b88)
- [x] T2 (S3, S4): Lógica de reanudación y configuración de preferencias de usuario con tests. (4706b88)
- [/] T3 (S1, S5): Creación de options.html, estilos y controlador src/options/index.ts. (inline)
- T4 (S6): Integración en vite.config.ts, verificación integral de tests y build de producción en dist/. (inline)

## Log
- L1: Usuario selecciona: "si dale" para implementar el Paso B (Historial de descargas local en options.html con reanudación automática).
