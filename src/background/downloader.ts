/**
 * Construye la URL de descarga oficial del XML de un comprobante en SRI en Línea.
 */
export function buildSriDownloadUrl(claveAcceso: string): string {
  const cleanKey = encodeURIComponent(claveAcceso.trim());
  return `https://srienlinea.sri.gob.ec/comprobantes-electronicos-internet/descargaXml?claveAcceso=${cleanKey}&tipo=07`;
}

/**
 * Valida si el contenido devuelto por el servidor corresponde a un XML de retención válido
 * y no a una página de error HTML (ej. sesión caducada o error de servidor).
 */
export function isXmlValidRetention(content: string): boolean {
  if (!content || typeof content !== 'string') return false;
  const trimmed = content.trim();

  // Descartar páginas HTML de error
  if (/^<!DOCTYPE\s+html/i.test(trimmed) || /^<html/i.test(trimmed)) {
    return false;
  }

  // Verificar marcas típicas de XML del SRI
  const hasXmlDeclaration = trimmed.startsWith('<?xml');
  const hasRetentionTag =
    trimmed.includes('<comprobanteRetencion') ||
    trimmed.includes('<autorizacion') ||
    trimmed.includes('<comprobante>');

  return (hasXmlDeclaration || trimmed.startsWith('<')) && hasRetentionTag;
}

/**
 * Convierte un string XML a un Data URL codificado en base64 para chrome.downloads.
 * Funciona de manera isomórfica tanto en entorno navegador como Node.js.
 */
export function xmlToDataUrl(xmlContent: string): string {
  let base64: string;
  if (typeof btoa !== 'undefined') {
    // Entorno navegador con soporte UTF-8 seguro
    base64 = btoa(unescape(encodeURIComponent(xmlContent)));
  } else if (typeof Buffer !== 'undefined') {
    // Entorno Node.js / pruebas
    base64 = Buffer.from(xmlContent, 'utf-8').toString('base64');
  } else {
    throw new Error('No base64 encoder available');
  }
  return `data:application/xml;base64,${base64}`;
}

/**
 * Realiza la petición autenticada para descargar el XML de la retención.
 * Utiliza las cookies de la sesión activa del SRI.
 */
export async function fetchRetentionXml(
  claveAcceso: string,
  urlOverride?: string
): Promise<{ xmlContent: string }> {
  const url = urlOverride || buildSriDownloadUrl(claveAcceso);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/xml, text/xml, */*',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
  }

  const text = await response.text();

  if (!isXmlValidRetention(text)) {
    throw new Error('La respuesta no es un XML válido del SRI (posible sesión expirada o error HTML).');
  }

  return { xmlContent: text };
}
