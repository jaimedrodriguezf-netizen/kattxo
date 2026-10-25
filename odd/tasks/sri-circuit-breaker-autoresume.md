# Feature: Circuit Breaker de Sesión y Banner de Auto-Reanudación SRI

Mecanismos de alta resiliencia para la extensión Kattxo SRI: detección de caídas de sesión mediante circuit breaker (3 fallos consecutivos), persistencia del punto de interrupción y banner interactivo de auto-reanudación al volver a ingresar al portal.

## Specs
- S1: Gestor de estado de auto-reanudación en historyManager.ts con métodos saveAutoResumeState, getAutoResumeState y clearAutoResumeState usando chrome.storage.local.
- S2: Circuit breaker en startBulkDownload (src/content/index.ts) que monitorea fallos consecutivos. Al alcanzar 3 fallos seguidos, detiene el bucle, marca la sesión como INTERRUMPIDA, guarda el estado de auto-reanudación y notifica al usuario.
- S3: Banner visual de auto-reanudación en InPageWidget (Shadow DOM) que se despliega si existe una tarea previa pendiente, permitiendo reanudarla con un clic.
- S4: Detección automática al cargar la página del SRI (DOMContentLoaded / init) para restaurar el contexto de la descarga interrumpida.
- S5: Suite de pruebas unitarias automatizadas con Vitest para el circuit breaker, el banner y el gestor de estado.

## Tasks
- [x] T1 (S1): Métodos de persistencia de auto-reanudación en historyManager.ts y tests unitarios. (23359f0)
- [/] T2 (S3): Componente de banner de auto-reanudación en InPageWidget y tests. (inline)
- T3 (S2, S4): Lógica de circuit breaker de 3 fallos consecutivos y verificación al inicio en content/index.ts. (inline)
- T4 (S5): Verificación integral, tests completos de la suite y build de producción en dist/. (inline)

## Log
- L1: Usuario confirma: "si dale" tras la auditoría con REA para implementar el circuit breaker y el banner de auto-reanudación.
