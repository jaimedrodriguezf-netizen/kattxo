# Kattxo SRI - Extensión de Google Chrome (Descarga Masiva Multi-Comprobante)

Plugin de Google Chrome (Manifest V3) desarrollado en **TypeScript** con **Vite** para la descarga masiva y controlada de comprobantes electrónicos (**Facturas, Retenciones, Notas de Crédito/Débito, Liquidaciones y Guías**) en formato **XML y RIDE (PDF)** directamente desde el portal oficial del **SRI en Línea (Ecuador)**.

Forma parte del ecosistema del sistema contable **Kattxo**.

---

## 🚀 Características Principales

- **Aprovechamiento de Sesión Activa:** Opera directamente en el navegador del usuario en `srienlinea.sri.gob.ec`. No requiere ingresar contraseñas, tokens bancarios ni resolver CAPTCHAs en servidores externos.
- **Panel Flotante Integrado (In-Page Shadow DOM):** Widget flotante moderno inyectado directamente en el portal del SRI (esquina inferior derecha), aislado con Shadow DOM para evitar conflictos de estilos con JSF/Mojarra. Permite iniciar descargas, pausar/reanudar y ver el progreso en tiempo real sin salir de la página.
- **Soporte Multi-Comprobante Universal:**
  - Facturas (`01`)
  - Liquidaciones de Compra (`03`)
  - Notas de Crédito (`04`)
  - Notas de Débito (`05`)
  - Guías de Remisión (`06`)
  - Comprobantes de Retención (`07`)
  - Soporte tanto para **Comprobantes Recibidos** como **Comprobantes Emitidos**.
- **Automatización de Formularios JSF:** Selección programática de dropdowns (Año, Mes, Día y Tipo de Comprobante) y disparo de búsqueda AJAX sin recarga total.
- **Consulta Continua por Rango de Fechas (Desde / Hasta):** Selector interactivo de rango de fechas en el panel flotante que automatiza la búsqueda secuencial día por día o meses completos, sorteando el error de "excedió el número máximo de registros" del SRI mediante ejecución desatendida.
- **Paginación Automática:** Recorre automáticamente todas las páginas de resultados de RichFaces / PrimeFaces (`.ui-paginator` / `.rich-datascr`).
- **Organización Jerárquica en Disco:**
  Estructura automática en la carpeta de descargas:
  ```
  Descargas/
    └── Kattxo/
        └── [RUC_Contribuyente]/
            └── [Año]/
                └── [Mes]/
                    └── [Tipo_Documento]/
                        └── [prefijo]_[numero]_[claveAcceso].xml (o .pdf)
  ```
- **Motor de Cola con Throttling Inteligente:** Para evitar bloqueos temporales por el WAF del SRI o caídas de sesión (errores 429/500), las descargas se ejecutan de manera secuencial y espaciada con pausas configuradas.
- **Validación de Integridad XML:** Antes de almacenar un archivo, el background worker valida que la respuesta sea un XML tributario auténtico del SRI, evitando que páginas HTML de error de sesión se guarden como archivos corruptos.
- **Exportador Tabular CSV/Excel:** Generación instantánea de archivo CSV con codificación UTF-8 BOM y delimitador `;` (estándar para Excel en español) con todos los metadatos de los comprobantes detectados (Emisor, Receptor, Fechas, Números, Tipo y Claves de acceso).
- **Descarga de Reporte TXT Oficial del SRI:** Disparador automático del enlace nativo del portal del SRI (`frmPrincipal:lnkTxtlistado`) para descargar el reporte TXT oficial del período con un solo clic.
- **Panel de Opciones e Historial (`options.html`):** Registro persistente de sesiones de descargas en `chrome.storage.local`, visualización tabular de lotes y **botón de reanudación automática** para procesar comprobantes pendientes o fallidos si la sesión del SRI se corta. Incluye configuración de directorio base y tiempos de espera de cortesía.
- **Panel de Control Dual (Popup + In-Page):** Disponible tanto desde el icono de extensiones de Chrome como mediante el widget flotante inyectado en el portal.

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

## 📄 Licencia y Autor

Desarrollado y mantenido por **Ing. Jaime Daniel Rodríguez** ([jaimedrodriguezf@gmail.com](mailto:jaimedrodriguezf@gmail.com)).  
LinkedIn: [linkedin.com/in/jaime-rodriguez-981463262](https://linkedin.com/in/jaime-rodriguez-981463262) | Portafolio: [januscore.pro](https://januscore.pro)  
Parte del ecosistema tributario y contable **Kattxo**.
