export interface BatchNotificationStats {
  total: number;
  completed: number;
  failed: number;
}

export function formatBatchNotification(stats: BatchNotificationStats): { title: string; message: string } {
  const title = '⚡ Kattxo SRI';

  if (stats.failed === 0) {
    return {
      title,
      message: `¡Descarga finalizada! ${stats.completed} comprobantes descargados con éxito en tu carpeta de descargas.`,
    };
  }

  return {
    title,
    message: `Lote finalizado: ${stats.completed} completados y ${stats.failed} con error de ${stats.total} comprobantes totales.`,
  };
}

/**
 * Muestra una notificación nativa del sistema operativo informando el fin de la descarga.
 */
export async function notifyBatchCompleted(stats: BatchNotificationStats): Promise<string | undefined> {
  const { title, message } = formatBatchNotification(stats);

  if (typeof chrome !== 'undefined' && chrome.notifications?.create) {
    return new Promise((resolve) => {
      const notificationId = `kattxo-sri-${Date.now()}`;
      // Usar data URI transparente si no hay icono físico cargado
      const fallbackIcon =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      chrome.notifications.create(
        notificationId,
        {
          type: 'basic',
          iconUrl: fallbackIcon,
          title,
          message,
          priority: 2,
        },
        (id) => {
          if (chrome.runtime?.lastError) {
            console.warn('[Kattxo SRI] Error mostrando notificación:', chrome.runtime.lastError);
            resolve(undefined);
          } else {
            resolve(id || notificationId);
          }
        }
      );
    });
  }

  return undefined;
}
