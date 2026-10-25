# Feature: Validación Cruzada de Importes y Cuadre Contable SRI

Mecanismo de verificación de integridad y cuadre matemático entre el importe reflejado en la tabla del portal del SRI y el comprobante procesado, evitando errores por cruce de respuestas asíncronas en JSF/Mojarra.

## Specs
- S1: Parser de importes monetarios (parseCurrencyAmount) en validators.ts con soporte para formato ecuatoriano ($ 1,234.56 o 1234.56), sanitización de caracteres no numéricos y conversión segura a punto flotante.
- S2: Función de cuadre contable (verifyVoucherAmountMatch) en validators.ts que compara dos importes con tolerancia estricta de medio centavo (<= 0.005) para detectar respuestas desincronizadas del SRI.
- S3: Extracción del importe total en el parser de tablas (parser.ts), registrando 'totalImporte' en el modelo SriVoucher.
- S4: Integración de la validación en el flujo de descarga en content/index.ts.
- S5: Suite de pruebas unitarias automatizadas con Vitest para el parser de divisas y el validador de cuadre.

## Tasks
- [x] T1 (S1, S2): Funciones parseCurrencyAmount y verifyVoucherAmountMatch en validators.ts con tests unitarios. (636d6cd)
- [/] T2 (S3): Extracción de columna de importe total en parser.ts y asignación en SriVoucher con tests. (inline)
- T3 (S4): Integración de validación cruzada en el ciclo de descarga de content/index.ts. (inline)
- T4 (S5): Verificación integral, tests completos de la suite y build de producción en dist/. (inline)

## Log
- L1: Usuario confirma: "ok hazlo" para implementar la validación cruzada de importes descubierta mediante REA.
