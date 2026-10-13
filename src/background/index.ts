import { DownloadQueueManager } from './queue';
import { ExtensionMessage, MessageResponse, QueueStateChangedMessage } from '../domain/messages';
import { RetentionVoucher } from '../domain/types';

console.log('[Kattxo SRI] Background service worker iniciado.');

const queueManager = new DownloadQueueManager();
let lastDetectedRetenciones: RetentionVoucher[] = [];

// Notificar cambios de estado a vistas activas (Popup / Sidepanel)
queueManager.onStateChange((state) => {
  const message: QueueStateChangedMessage = {
    type: 'QUEUE_STATE_CHANGED',
    payload: state,
  };

  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage(message, () => {
        if (chrome.runtime.lastError) {
          // Normal si no hay popup abierto en este instante
        }
      });
    }
  } catch (err) {
    console.debug('[Kattxo SRI] No hay receptores activos para QUEUE_STATE_CHANGED:', err);
  }
});

// Receptor de mensajes del Content Script y Popup
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener(
    (
      message: ExtensionMessage,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: MessageResponse<unknown>) => void
    ) => {
      switch (message.type) {
        case 'RETENTIONS_DETECTED': {
          lastDetectedRetenciones = message.payload.retenciones;
          // Guardar en storage local para que el popup lo lea al abrirse
          chrome.storage?.local?.set({
            kattxo_last_detected: lastDetectedRetenciones,
            kattxo_last_detected_url: message.payload.pageUrl,
          });
          sendResponse({ success: true, data: { count: lastDetectedRetenciones.length } });
          break;
        }

        case 'START_DOWNLOAD_QUEUE': {
          const vouchersToDownload =
            message.payload?.retenciones && message.payload.retenciones.length > 0
              ? message.payload.retenciones
              : lastDetectedRetenciones;

          if (vouchersToDownload.length > 0) {
            queueManager.enqueue(vouchersToDownload);
            queueManager.start().catch((err) => {
              console.error('[Kattxo SRI] Error ejecutando la cola:', err);
            });
            sendResponse({ success: true, data: queueManager.getState() });
          } else {
            sendResponse({ success: false, error: 'No hay retenciones para descargar.' });
          }
          break;
        }

        case 'PAUSE_DOWNLOAD_QUEUE': {
          queueManager.pause();
          sendResponse({ success: true, data: queueManager.getState() });
          break;
        }

        case 'RESUME_DOWNLOAD_QUEUE': {
          queueManager.resume();
          queueManager.start().catch((err) => {
            console.error('[Kattxo SRI] Error reanudando la cola:', err);
          });
          sendResponse({ success: true, data: queueManager.getState() });
          break;
        }

        case 'CLEAR_QUEUE': {
          queueManager.clear();
          sendResponse({ success: true, data: queueManager.getState() });
          break;
        }

        case 'GET_QUEUE_STATE': {
          sendResponse({
            success: true,
            data: {
              queueState: queueManager.getState(),
              detectedCount: lastDetectedRetenciones.length,
            },
          });
          break;
        }

        default:
          break;
      }

      return true; // Respuesta asíncrona
    }
  );
}

export { queueManager };
