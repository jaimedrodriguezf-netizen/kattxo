import { extractRetentionsFromDom } from './parser';
import { ExtensionMessage, RetentionsDetectedMessage, MessageResponse } from '../domain/messages';
import { RetentionVoucher } from '../domain/types';

class SriContentScript {
  private lastDetectedKeys: Set<string> = new Set();
  private observer: MutationObserver | null = null;
  private debounceTimer: number | null = null;

  public init(): void {
    console.log('[Kattxo SRI] Content script inicializado.');
    this.scanAndNotify();
    this.setupMutationObserver();
    this.setupMessageListener();
  }

  public scan(): RetentionVoucher[] {
    const retenciones = extractRetentionsFromDom(document);
    return retenciones;
  }

  public scanAndNotify(): void {
    const retenciones = this.scan();
    const currentKeys = new Set(retenciones.map((r) => r.claveAcceso));

    // Solo notificar si hay retenciones y hubo cambios respecto al último escaneo
    const isDifferent =
      currentKeys.size !== this.lastDetectedKeys.size ||
      Array.from(currentKeys).some((k) => !this.lastDetectedKeys.has(k));

    if (isDifferent) {
      this.lastDetectedKeys = currentKeys;
      console.log(`[Kattxo SRI] ${retenciones.length} retenciones detectadas en la página.`);

      const message: RetentionsDetectedMessage = {
        type: 'RETENTIONS_DETECTED',
        payload: {
          retenciones,
          pageUrl: window.location.href,
          timestamp: Date.now(),
        },
      };

      try {
        if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
          chrome.runtime.sendMessage(message, () => {
            // Ignorar error si el popup o background no están escuchando en ese milisegundo
            if (chrome.runtime.lastError) {
              // noop
            }
          });
        }
      } catch (err) {
        console.warn('[Kattxo SRI] Error enviando mensaje a la extensión:', err);
      }
    }
  }

  private setupMutationObserver(): void {
    if (!document.body) return;

    this.observer = new MutationObserver(() => {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      this.debounceTimer = window.setTimeout(() => {
        this.scanAndNotify();
      }, 600);
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private setupMessageListener(): void {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return;

    chrome.runtime.onMessage.addListener(
      (
        message: ExtensionMessage,
        _sender: chrome.runtime.MessageSender,
        sendResponse: (response: MessageResponse<{ retenciones: RetentionVoucher[] }>) => void
      ) => {
        if (message.type === 'SCAN_PAGE_REQUEST') {
          const retenciones = this.scan();
          this.lastDetectedKeys = new Set(retenciones.map((r) => r.claveAcceso));
          sendResponse({
            success: true,
            data: { retenciones },
          });
          return true;
        }
        return false;
      }
    );
  }
}

// Inicializar automáticamente en el navegador
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const contentScript = new SriContentScript();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => contentScript.init());
  } else {
    contentScript.init();
  }
}

export { SriContentScript };
