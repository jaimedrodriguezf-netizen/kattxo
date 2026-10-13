# Feature: Plugin Chrome SRI - Descarga de Retenciones (XML)

## Contexto
Extensión de Google Chrome (Manifest V3) para el sistema contable Kattxo.
Permite descargar en lote los comprobantes electrónicos de retención en formato XML directamente desde el portal SRI en Línea (Ecuador), aprovechando la sesión activa del usuario y usando la API de descargas del navegador (`chrome.downloads`).

## Alcance Acordado
- **Comprobantes:** Retenciones (comprobantes de retención).
- **Formato:** Únicamente XML.
- **Modo de entrega:** Descarga directa de archivos en el navegador vía `chrome.downloads`.
- **Stack:** TypeScript + Vite + Vitest para pruebas unitarias.

## Tareas

- [x] **1. Scaffolding del proyecto y configuración de Vite + TypeScript + Vitest**
  - Inicializar `package.json`, `tsconfig.json`, configuración de Vite para extensión Manifest V3 y Vitest para testing.
  - Dependencias mínimas y scripts de build / test.
  - *Evidencia:* Tests ejecutables y build inicial funcional (`fc36510`). Pipeline dual Vite (ES modules para popup/background + IIFE autocontenido para content script).

- [x] **2. Tipos de dominio, contratos de mensajería y configuración del Manifest V3**
  - Definir tipos de comprobantes, estados de descarga, eventos entre Content Script, Background Service Worker y Popup.
  - Crear `manifest.json` con permisos estrictos (`storage`, `downloads`, host permissions para `srienlinea.sri.gob.ec`).
  - *Evidencia:* Tipado estricto, validadores y manifest validado (`dd695cf`). 14 tests unitarios en verde.

- [ ] **3. Content Script para SRI en Línea (Extractor de Retenciones)**
  - Detectar la vista de consulta de comprobantes de retención.
  - Extracción de claves de acceso y metadatos (fecha, RUC emisor/retenedor, número de comprobante) desde el DOM / respuestas del SRI.
  - Comunicación con el Background Worker.
  - *Evidencia:* Parser testeado con fixtures de ejemplo del SRI.

- [ ] **4. Background Service Worker: Motor de cola de descargas con Throttling**
  - Implementar cola de descarga (`DownloadQueue`) con control de concurrencia y pausas (throttling) para evitar rate-limiting del SRI.
  - Mecanismo de fetch del XML autenticado con la sesión del navegador.
  - Guardado ordenado mediante `chrome.downloads.download`.
  - *Evidencia:* Pruebas unitarias de la cola (throttling, reintentos y reporte de progreso).

- [ ] **5. Popup UI: Panel de control básico**
  - Vista popup en TypeScript con estado de comprobantes detectados en la pestaña activa.
  - Botón de descarga masiva, barra de progreso en tiempo real y contador de éxitos/fallos.
  - *Evidencia:* Componente popup renderizado y enlazado a la mensajería interna.

- [ ] **6. Verificación integral, tests y empaquetado**
  - Ejecutar suite de pruebas con Vitest.
  - Build de producción con Vite (`npm run build`).
  - Instrucciones claras para cargar la extensión en Chrome Developer Mode (`chrome://extensions`).
  - *Evidencia:* Build limpio en `dist/` y suite de tests en verde.
