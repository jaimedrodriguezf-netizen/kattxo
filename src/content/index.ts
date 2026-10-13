import { extractRetentionsFromDom } from './parser';
import { ExtensionMessage, RetentionsDetectedMessage, MessageResponse } from '../domain/messages';
import { RetentionVoucher } from '../domain/types';

class SriContentScript {
  private lastDetectedKeys: Set<string> = new Set();
  private observer: MutationObserver | null = null;
  private debounceTimer: number | null = null;
  private pollingTimer: number | null = null;

  public init(): void {
    console.log('[Kattxo SRI] Content script inicializado en:', window.location.href);
    this.scanAndNotify();
    this.setupMutationObserver();
    this.setupPolling();
    this.setupMessageListener();
  }

  public scan(): RetentionVoucher[] {
    try {
      const retenciones = extractRetentionsFromDom(document);
      return retenciones;
    } catch (err) {
      console.error('[Kattxo SRI] Error extrayendo retenciones del DOM:', err);
      return [];
    }
  }

  public scanAndNotify(): void {
    const retenciones = this.scan();
    const currentKeys = new Set(retenciones.map((r) => r.claveAcceso));

    // Notificar si hay retenciones y hubo cambios
    const isDifferent =
      currentKeys.size !== this.lastDetectedKeys.size ||
      Array.from(currentKeys).some((k) => !this.lastDetectedKeys.has(k));

    if (isDifferent && retenciones.length > 0) {
      this.lastDetectedKeys = currentKeys;
      console.log(`[Kattxo SRI] ✅ ${retenciones.length} retenciones detectadas en la página.`);

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
      }, 500);
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  private setupPolling(): void {
    // Sondeo de respaldo cada 1.5s para capturar actualizaciones AJAX de RichFaces
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
    }
    this.pollingTimer = window.setInterval(() => {
      this.scanAndNotify();
    }, 1500);
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
