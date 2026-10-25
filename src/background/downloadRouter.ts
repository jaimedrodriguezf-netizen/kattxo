import { getSriDocumentTypeName } from '../domain/validators';

/**
 * Resuelve la ruta jerárquica para un archivo descargado desde el SRI en Línea.
 * Intercepta tanto descargas iniciadas por el Content Script (clicks en DOM) como fetch directos.
 */
export function resolveDynamicDownloadPath(
  downloadItem: chrome.downloads.DownloadItem,
  baseDirectory = 'Kattxo'
): string | null {
  const url = downloadItem.url || '';
  const finalUrl = downloadItem.finalUrl || '';
  const isSriOrigin =
    url.includes('srienlinea.sri.gob.ec') ||
    finalUrl.includes('srienlinea.sri.gob.ec') ||
    url.includes('comprobantes-electronicos') ||
    finalUrl.includes('comprobantes-electronicos');

  if (!isSriOrigin) {
    return null;
  }

  const combinedMeta = `${downloadItem.filename} ${finalUrl} ${url}`;

  // 1. Detección de comprobante electrónico por clave de 49 dígitos
  const match = combinedMeta.match(/(?<!\d)\d{49}(?!\d)/);
  if (match) {
    const key = match[0];
    const day = key.substring(0, 2);
    const month = key.substring(2, 4);
    const year = key.substring(4, 8);
    const typeCode = key.substring(8, 10);
    const ruc = key.substring(10, 23);
    const typeName = getSriDocumentTypeName(typeCode);
    const ext = downloadItem.filename.toLowerCase().endsWith('.pdf') ? 'pdf' : 'xml';
    const cleanBase = baseDirectory.replace(/^\/+|\/+$/g, '');

    return `${cleanBase}/${ruc}/${year}/${month}/${typeName}/${typeName.toLowerCase()}_${key}.${ext}`;
  }

  // 2. Detección de reporte TXT oficial del SRI
  if (downloadItem.filename.toLowerCase().endsWith('.txt')) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const cleanBase = baseDirectory.replace(/^\/+|\/+$/g, '');

    return `${cleanBase}/Reportes/${y}/${m}/TXT/${downloadItem.filename}`;
  }

  return null;
}

/**
 * Configura los interceptores de descarga de Chrome:
 * 1. onDeterminingFilename: organiza archivos en carpetas jerárquicas.
 * 2. onChanged: aprueba automáticamente advertencias de múltiples descargas para el SRI.
 */
export function setupDownloadRouter(options: { baseDirectory?: string } = {}): void {
  if (typeof chrome === 'undefined' || !chrome.downloads) return;

  // 1. Interceptar nombres de archivo para descargas del SRI
  if (chrome.downloads.onDeterminingFilename) {
    chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
      try {
        const customPath = resolveDynamicDownloadPath(item, options.baseDirectory || 'Kattxo');
        if (customPath) {
          suggest({
            filename: customPath,
            conflictAction: 'overwrite',
          });
          return;
        }
      } catch (err) {
        console.warn('[Kattxo SRI] Error determinando ruta de descarga:', err);
      }

      suggest();
    });
  }

  // 2. Auto-aprobar descargas múltiples o advertencias en srienlinea.sri.gob.ec
  if (chrome.downloads.onChanged) {
    chrome.downloads.onChanged.addListener((delta) => {
      if (
        delta.danger &&
        delta.danger.current &&
        delta.danger.current !== 'safe' &&
        delta.danger.current !== 'accepted'
      ) {
        chrome.downloads.search({ id: delta.id }, ([item]) => {
          if (
            item &&
            (item.url.includes('srienlinea.sri.gob.ec') ||
              item.finalUrl?.includes('srienlinea.sri.gob.ec') ||
              item.url.includes('comprobantes-electronicos'))
          ) {
            chrome.downloads.acceptDanger(delta.id, () => {
              if (chrome.runtime.lastError) {
                // noop
              }
            });
          }
        });
      }
    });
  }
}
