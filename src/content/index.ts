import { extractRetentionsFromDom } from './parser';
import {
  ExtensionMessage,
  RetentionsDetectedMessage,
  MessageResponse,
  DownloadProgressUpdateMessage,
} from '../domain/messages';
import { RetentionVoucher } from '../domain/types';

class SriContentScript {
  private lastDetectedKeys: Set<string> = new Set();
  private observer: MutationObserver | null = null;
  private debounceTimer: number | null = null;
  private pollingTimer: number | null = null;

  // Estado de descarga en página
  private isDownloading = false;
  private isPaused = false;
  private currentDownloadIndex = 0;
  private downloadVouchersList: RetentionVoucher[] = [];

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

  public async startBulkDownload(vouchers?: RetentionVoucher[]): Promise<void> {
    if (this.isDownloading) return;

    this.downloadVouchersList = vouchers && vouchers.length > 0 ? vouchers : this.scan();
    if (this.downloadVouchersList.length === 0) {
      console.warn('[Kattxo SRI] No hay retenciones disponibles para descargar.');
      return;
    }

    this.isDownloading = true;
    this.isPaused = false;
    this.currentDownloadIndex = 0;

    let completed = 0;
    let failed = 0;

    console.log(`[Kattxo SRI] Iniciando descarga de ${this.downloadVouchersList.length} retenciones vía JSF...`);

    while (this.currentDownloadIndex < this.downloadVouchersList.length && !this.isPaused) {
      const voucher = this.downloadVouchersList[this.currentDownloadIndex];
      this.broadcastProgress(this.downloadVouchersList.length, completed, failed, voucher.claveAcceso, false);

      const success = this.triggerDownloadForVoucher(voucher, this.currentDownloadIndex);
      if (success) {
        completed++;
      } else {
        failed++;
      }

      this.currentDownloadIndex++;
      this.broadcastProgress(this.downloadVouchersList.length, completed, failed, undefined, false);

      // Throttling de 1200ms entre clicks para que el servidor SRI y Mojarra no se saturen
      if (this.currentDownloadIndex < this.downloadVouchersList.length && !this.isPaused) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }
    }

    this.isDownloading = false;
    const isFinished = this.currentDownloadIndex >= this.downloadVouchersList.length;
    this.broadcastProgress(this.downloadVouchersList.length, completed, failed, undefined, isFinished);
    console.log(`[Kattxo SRI] Descarga finalizada: ${completed} completados, ${failed} fallidos.`);
  }

  private triggerDownloadForVoucher(voucher: RetentionVoucher, index: number): boolean {
    try {
      // 1. Intentar por elementId guardado
      if (voucher.elementId) {
        const el = document.getElementById(voucher.elementId);
        if (el) {
          console.log(`[Kattxo SRI] Click en elemento por ID: ${voucher.elementId}`);
          el.click();
          return true;
        }
      }

      // 2. Intentar buscar enlace por índice estándar de tabla Mojarra
      const indexedId = `frmPrincipal:tablaCompRecibidos:${index}:lnkXml`;
      const indexedEl = document.getElementById(indexedId);
      if (indexedEl) {
        console.log(`[Kattxo SRI] Click en elemento por índice: ${indexedId}`);
        indexedEl.click();
        return true;
      }

      // 3. Fallback: buscar cualquier enlace lnkXml de la lista por posición
      const allXmlLinks = document.querySelectorAll<HTMLElement>('a[id*="lnkXml"], button[id*="lnkXml"]');
      if (allXmlLinks[index]) {
        console.log(`[Kattxo SRI] Click en elemento por querySelectorAll index: ${index}`);
        allXmlLinks[index].click();
        return true;
      }

      console.warn(`[Kattxo SRI] No se encontró el botón de descarga XML para el comprobante en índice ${index}`);
      return false;
    } catch (err) {
      console.error(`[Kattxo SRI] Error al ejecutar click de descarga para ${voucher.claveAcceso}:`, err);
      return false;
    }
  }

  public pauseBulkDownload(): void {
    this.isPaused = true;
    this.isDownloading = false;
    this.broadcastProgress(this.downloadVouchersList.length, this.currentDownloadIndex, 0, undefined, false);
  }

  public resumeBulkDownload(): void {
    if (this.isPaused) {
      this.isPaused = false;
      this.startBulkDownload(this.downloadVouchersList);
    }
  }

  private broadcastProgress(
    total: number,
    completed: number,
    failed: number,
    currentKey?: string,
    isFinished = false
  ): void {
    const msg: DownloadProgressUpdateMessage = {
      type: 'DOWNLOAD_PROGRESS_UPDATE',
      payload: {
        total,
        completed,
        failed,
        currentKey,
        isPaused: this.isPaused,
        isFinished,
      },
    };

    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage(msg, () => {
          if (chrome.runtime.lastError) {
            // noop si popup está cerrado
          }
        });
      }
    } catch {
      // noop
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
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
    }
    this.pollingTimer = window.setInterval(() => {
      if (!this.isDownloading) {
        this.scanAndNotify();
      }
    }, 1500);
  }

  private setupMessageListener(): void {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return;

    chrome.runtime.onMessage.addListener(
      (
        message: ExtensionMessage,
        _sender: chrome.runtime.MessageSender,
        sendResponse: (response: MessageResponse<unknown>) => void
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

        if (message.type === 'START_IN_PAGE_DOWNLOAD') {
          this.startBulkDownload(message.payload?.retenciones);
          sendResponse({ success: true, data: { status: 'started' } });
          return true;
        }

        if (message.type === 'PAUSE_IN_PAGE_DOWNLOAD') {
          this.pauseBulkDownload();
          sendResponse({ success: true, data: { status: 'paused' } });
          return true;
        }

        if (message.type === 'RESUME_IN_PAGE_DOWNLOAD') {
          this.resumeBulkDownload();
          sendResponse({ success: true, data: { status: 'resumed' } });
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
