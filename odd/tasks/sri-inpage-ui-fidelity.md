# Feature: Rediseño Visual de Alta Fidelidad del Widget In-Page SRI

Alineación estética y funcional del widget flotante in-page (Shadow DOM) para replicar la estructura, controles, ergonomía visual y lista de descarga en vivo observadas en la extensión de TribuExcel (XML Manager).

## Specs
- S1: Estructura visual de alta fidelidad: contenedor de 384px (#F8F9FF), cabecera con marca, minimizar y ajustes, y tarjeta de estado de comprobantes con icono destacado y conteo.
- S2: Selector de formato por grupo de radio buttons: 'XML Firmados' (default), 'Archivos PDF (RIDE)' y 'Reportes TXT'.
- S3: Lista en vivo de comprobantes procesados (kattxo-download-list): contenedor scrolleable (max 220px) que renderiza cada comprobante en tiempo real mostrando número de serie, tipo/emisor y estado visual (spinner animado durante descarga, badge verde 'Descargado' o badge rojo 'Error').
- S4: Aviso de reanudación estilizado (#FFFBEB con borde #FDE68A) con botón primario 'Reanudar Descarga'.
- S5: Suite de pruebas unitarias automatizadas con Vitest para los nuevos componentes y eventos del widget.

## Tasks
- T1 (S1, S2): Rediseño de plantilla HTML y estilos CSS en inPageWidget.ts (layout 384px, radio buttons de formato, tarjeta de estado) con tests. (inline)
- T2 (S3): Implementación de lista en vivo de comprobantes (addDownloadItem, updateItemStatus) con spinner y badges en inPageWidget.ts y tests. (inline)
- T3 (S3, S4): Conexión de eventos en content/index.ts para actualizar la lista en vivo en cada paso de descarga. (inline)
- T4 (S5): Verificación integral, tests de la suite completa y build de producción en dist/. (inline)

## Log
- L1: Usuario solicita: "hagam9s una nueva auditoria con rea en b7snque de alhonque falta la interfaz debe ser similar r3visa".
