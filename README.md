# Kattxo SRI - Extensión de Google Chrome

Plugin de Google Chrome (Manifest V3) desarrollado en **TypeScript** con **Vite** para la descarga masiva y controlada de comprobantes electrónicos de **Retención (XML)** desde el portal oficial del **SRI en Línea (Ecuador)**.

Forma parte del ecosistema del sistema contable **Kattxo**.

---

## 🚀 Características Principales

- **Aprovechamiento de Sesión Activa:** Opera directamente en el navegador del usuario en `srienlinea.sri.gob.ec`. No requiere ingresar contraseñas, tokens bancarios ni resolver CAPTCHAs en servidores externos.
- **Detección Automática de Retenciones:** Content script resiliente con `MutationObserver` que detecta la tabla de resultados de comprobantes de retención (código de documento `07`) y descompone la clave de acceso de 49 dígitos para extraer emisor, fecha y secuencial.
- **Motor de Cola con Throttling Inteligente:** Para evitar bloqueos temporales por el WAF del SRI o caídas de sesión (errores 429/500), las descargas se ejecutan de manera secuencial y espaciada con pausas configuradas.
- **Validación de Integridad XML:** Antes de almacenar un archivo, el background worker valida que la respuesta sea un XML tributario auténtico del SRI (`<comprobanteRetencion>` o `<autorizacion>`), evitando que páginas HTML de error de sesión se guarden como archivos corruptos.
- **Descargas Nativas:** Utiliza la API `chrome.downloads` para almacenar los archivos ordenadamente en `Descargas/Kattxo/Retenciones/`.
- **Panel de Control Popup:**
  - Contador de comprobantes detectados en la pestaña actual.
  - Barra de progreso porcentual y conteo en tiempo real (total, pendientes, completados, fallidos).
  - Botones para Iniciar, Pausar / Reanudar y Limpiar cola.
  - Registro visible de errores si algún comprobante falla tras los reintentos.

---

## 🛠️ Stack Tecnológico

- **Lenguaje:** TypeScript 5.8+ (tipado estricto)
- **Bundler:** Vite 6 (arquitectura multi-entry con empaquetado dual: ES Modules para Background/Popup y bundle IIFE autocontenido para el Content Script)
- **Testing:** Vitest 3 + Happy DOM (suite completa de pruebas unitarias para parsers, validadores y motor de cola)
- **Plataforma:** Chrome Extensions Manifest V3

---

## 📦 Instalación y Desarrollo

### Requisitos
- Node.js v20 o superior
- npm v10 o superior
- Google Chrome o navegador compatible basado en Chromium (Brave, Edge, etc.)

### 1. Clonar e instalar dependencias
```bash
git clone <repo-url>
cd kattxo
npm install
```

### 2. Ejecutar la suite de pruebas
```bash
npm test
```

### 3. Compilar para producción
```bash
npm run build
```
Esto genera la carpeta optimizada `dist/` lista para ser cargada en el navegador.

### 4. Modo desarrollo (recarga continua)
```bash
npm run dev
```

---

## 🔌 Cómo Cargar la Extensión en Google Chrome

1. Abrí Google Chrome y navegá a `chrome://extensions/` (o andá al menú de 3 puntos > *Extensiones* > *Administrar extensiones*).
2. En la esquina superior derecha, activá el interruptor **"Modo de desarrollador"** (*Developer mode*).
3. Hacé clic en el botón **"Cargar descomprimida"** (*Load unpacked*).
4. Seleccioná la carpeta `dist/` dentro del proyecto `kattxo`.
5. ¡Listo! Verás la tarjeta de **Kattxo - Descargador de Retenciones SRI** en tu lista de extensiones. Te recomendamos fijar (*pin*) el ícono en la barra superior.

---

## 📖 Guía de Uso Paso a Paso

1. Ingresá al portal oficial del SRI: [https://srienlinea.sri.gob.ec/](https://srienlinea.sri.gob.ec/) e iniciá sesión con tu RUC y contraseña.
2. Navegá al módulo de **Facturación Electrónica** > **Comprobantes electrónicos recibidos** (o emitidos).
3. Seleccioná el año, mes y en el campo *Tipo de comprobante* elegí **Comprobante de Retención**.
4. Hacé clic en **Consultar**. Una vez que el SRI cargue la grilla con los resultados:
5. Hacé clic en el ícono de la extensión **Kattxo SRI** en la barra del navegador.
6. El popup indicará:
   - Estado: `SRI Conectado`
   - Cantidad de retenciones encontradas (ej. `25 comprobantes listos`).
7. Presioná el botón azul **"Descargar Retenciones XML"**.
8. Observá el progreso en tiempo real. Los archivos XML válidos se descargarán automáticamente en tu carpeta local de descargas bajo:
   ```text
   Descargas/Kattxo/Retenciones/retencion_<claveAcceso>.xml
   ```

---

## 🧪 Estructura del Proyecto

```text
kattxo/
├── public/
│   └── manifest.json          # Manifest V3 de la extensión
├── src/
│   ├── background/
│   │   ├── downloader.ts      # Fetch autenticado y validación de XML
│   │   ├── index.ts           # Service worker y ruteo de mensajes
│   │   └── queue.ts           # Gestor de cola con throttling y reintentos
│   ├── common/
│   │   └── sample.ts
│   ├── content/
│   │   ├── index.ts           # Inyección y listener en páginas del SRI
│   │   └── parser.ts          # Extracción y descomposición de 49 dígitos
│   ├── domain/
│   │   ├── messages.ts        # Contratos de mensajes inter-proceso
│   │   ├── types.ts           # Interfaces de comprobantes y cola
│   │   └── validators.ts      # Validadores de RUC, clave de acceso y rutas
│   └── popup/
│       ├── controller.ts      # Lógica y actualización reactiva de la UI
│       ├── index.ts           # Punto de entrada del popup
│       └── style.css          # Estilos modernos y responsivos
├── tests/
│   ├── domain.test.ts         # Pruebas de validadores y tipos
│   ├── downloader.test.ts     # Pruebas del cliente HTTP del SRI
│   ├── parser.test.ts         # Pruebas de extracción DOM y claves
│   ├── popup.test.ts          # Pruebas de cálculos de progreso
│   ├── queue.test.ts          # Pruebas de throttling, pausas y reintentos
│   └── smoke.test.ts          # Prueba de entorno base
├── popup.html                 # Vista HTML del panel popup
├── tsconfig.json              # Configuración TypeScript
├── vite.config.ts             # Configuración Vite (Background & Popup)
├── vite.content.config.ts     # Configuración Vite IIFE (Content Script)
└── vitest.config.ts           # Configuración de pruebas Vitest + Happy DOM
```

---

## 📄 Licencia

Uso interno para el sistema contable **Kattxo**.
