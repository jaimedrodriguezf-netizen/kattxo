# Feature: Rango de Fechas y Consulta Continua SRI

Automatización de consultas sucesivas por rango de fechas (Desde/Hasta) en el portal SRI en Línea, permitiendo la extracción y descarga masiva desatendida día por día o mes a mes sin superar los límites de registros del SRI.

## Specs
- S1: Inputs de fecha 'Desde' y 'Hasta' en InPageWidget con valores iniciales por defecto al mes en curso (del primer día al día actual).
- S2: Utilidad de iteración temporal (dateRangeIterator.ts) que transforma un rango Desde-Hasta en una secuencia ordenada de consultas { year, month, day } con validación de límites.
- S3: Motor de consulta continua (batchQueryRunner.ts) que automatiza el ciclo: seleccionar fecha en dropdowns -> disparar búsqueda AJAX -> esperar resultados -> paginar si aplica -> recolectar comprobantes -> throttling de cortesía -> siguiente fecha.
- S4: Controles de pausa, cancelación y retroalimentación en tiempo real en el widget (mostrando fecha activa y avance acumulado).
- S5: Suite de pruebas unitarias automatizadas con Vitest para el iterador de fechas y el motor de consultas por lotes.

## Tasks
- [x] T1 (S1, S2): Módulo de iteración de rango de fechas (dateRangeIterator.ts) con tests unitarios. (cb0c1d5)
- [x] T2 (S3): Motor de orquestación de consultas continuas (batchQueryRunner.ts) con tests unitarios. (4f64510)
- [/] T3 (S1, S4): Integración de inputs de fecha y botón 'Descargar Rango' en InPageWidget y content script. (inline)
- T4 (S5): Verificación integral, tests de la suite completa y build de producción en dist/. (inline)

## Log
- L1: Usuario selecciona opción A: "el a" (Rango de fechas y consulta continua Desde/Hasta en el widget in-page).
