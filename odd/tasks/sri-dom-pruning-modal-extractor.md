# Feature: Poda de Memoria DOM, Atajo Doble-Clic y Extractor de Modales PrimeFaces

Refinamientos avanzados para Kattxo SRI: optimización de memoria DOM (poda de lista a 100 elementos), atajo de doble clic para colapsar y extractor/cerrador automático de modales de detalle de PrimeFaces (.ui-dialog).

## Specs
- S1: Atajo de doble clic (dblclick) en la cabecera del widget in-page para alternar entre minimizar y expandir sin afectar clics en botones de acción.
- S2: Poda de memoria DOM (DOM pruning) en la lista en vivo de descargas: retiene un máximo de 100 elementos visibles en pantalla durante descargas masivas (+500 comprobantes), evitando degradación de rendimiento.
- S3: Módulo de inspección y cierre de modales PrimeFaces (extractClaveFromModalDialog, closeSriModalDialog) en parser.ts para tablas donde la clave de acceso se encuentra oculta dentro de un diálogo emergente (.ui-dialog).
- S4: Suite de pruebas unitarias automatizadas con Vitest para el atajo de doble clic, la poda de lista y el extractor de modales.

## Tasks
- [x] T1 (S1, S2): Doble clic en cabecera y poda de lista a 100 elementos en inPageWidget.ts con tests unitarios. (1456ae8)
- [/] T2 (S3): Funciones extractClaveFromModalDialog y closeSriModalDialog en parser.ts con tests unitarios. (inline)
- T3 (S4): Verificación integral, tests de la suite completa y build de producción en dist/. (inline)

## Log
- L1: Usuario confirma: "si dale" tras la segunda auditoría forense con REA.
