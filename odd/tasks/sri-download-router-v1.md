# Feature: Enrutador Nativo de Descargas, Auto-Permisos y Notificaciones (v1.0.0)

Implementación del enrutador dinámico de descargas en segundo plano con onDeterminingFilename, aprobación automática de descargas múltiples y notificaciones nativas de escritorio para la versión definitiva v1.0.0.

## Specs
- S1: Interceptor chrome.downloads.onDeterminingFilename en el Service Worker para capturar descargas nativas generadas por clics en el DOM del SRI y organizarlas en 'Kattxo/[RUC]/[Año]/[Mes]/[Tipo]/[Archivo]'.
- S2: Detección y aprobación desatendida de descargas múltiples o advertencias de seguridad para URLs de 'srienlinea.sri.gob.ec' mediante chrome.downloads.acceptDanger.
- S3: Notificaciones nativas del sistema operativo con chrome.notifications.create al finalizar cada lote de comprobantes.
- S4: Adición de permiso 'notifications' en manifest.json y actualización de versión a 1.0.0.
- S5: Suite de pruebas unitarias automatizadas con Vitest para el enrutador y notificaciones.

## Tasks
- [x] T1 (S1, S2): Módulo downloadRouter.ts con interceptor de nombres, auto-danger approval y tests unitarios. (429b159)
- [x] T2 (S3): Sistema de notificaciones de escritorio en notifications.ts y tests. (0d2bc29)
- [x] T3 (S1, S3): Integración en background/index.ts y content/index.ts con permisos en manifest.json. (7f499a9)
- [x] T4 (S4, S5): Bump a v1.0.0, verificación integral de 111+ tests y build de producción en dist/. (429b159, 0d2bc29, 7f499a9)

## Log
- L1: Usuario confirma: "ok dale" para implementar los 3 puntos finales de producción y lanzar v1.0.0.
