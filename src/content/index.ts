import {
  extractRetentionsFromDom,
  extractVouchersFromDom,
  extractTaxpayerProfileFromDom,
} from './parser';
import { InPageWidget } from './inPageWidget';
import {
  ExtensionMessage,
  RetentionsDetectedMessage,
  MessageResponse,
  DownloadProgressUpdateMessage,
} from '../domain/messages';
import { RetentionVoucher, SriVoucher } from '../domain/types';

class SriContentScript {
  private lastDetectedKeys: Set<string> = new Set();
  private observer: MutationObserver | null = null;
  private debounceTimer: number | null = null;
  private pollingTimer: number | null = null;
  private widget: InPageWidget | null = null;

  // Estado de descarga en página
  private isDownloading = false;
  private isPaused = false;
  private currentDownloadIndex = 0;
  private downloadVouchersList: SriVoucher[] = [];

  public init(): void {
    console.log('[Kattxo SRI] Content script inicializado en:', window.location.href);
    this.initWidget();
    this.scanAndNotify();
    this.setupMutationObserver();
    this.setupPolling();
    this.setupMessageListener();
  }

  private initWidget(): void {
    if (typeof document === 'undefined') return;
    this.widget = new InPageWidget({
      onStartDownload: (docType) => {
        const vouchers = this.scan(docType);
        this.startBulkDownload(vouchers);
      },
      onPauseDownload: () => this.pauseBulkDownload(),
      onResumeDownload: () => this.resumeBulkDownload(),
    });

    if (document.body) {
      this.widget.mount(document.body);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        if (document.body && this.widget) {
          this.widget.mount(document.body);
        }
      });
    }
  }

  public scan(filterType?: string): SriVoucher[] {
    try {
      const vouchers = extractVouchersFromDom(document, filterType);
      return vouchers;
    } catch (err) {
      console.error('[Kattxo SRI] Error extrayendo comprobantes del DOM:', err);
      return [];
    }
  }

  public scanAndNotify(): void {
    const vouchers = this.scan();
    const profile = extractTaxpayerProfileFromDom(document);
    if (profile && this.widget) {
      this.widget.setTaxpayerProfile(profile);
    }

    const currentKeys = new Set(vouchers.map((r) => r.claveAcceso));

    const isDifferent =
      currentKeys.size !== this.lastDetectedKeys.size ||
      Array.from(currentKeys).some((k) => !this.lastDetectedKeys.has(k));

    if (isDifferent && vouchers.length > 0) {
      this.lastDetectedKeys = currentKeys;
      console.log(`[Kattxo SRI] ✅ ${vouchers.length} comprobantes detectados en la página.`);

      const message: RetentionsDetectedMessage = {
        type: 'RETENTIONS_DETECTED',
        payload: {
          retenciones: vouchers,
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

  public async startBulkDownload(vouchers?: SriVoucher[]): Promise<void> {
    if (this.isDownloading) return;

    this.downloadVouchersList = vouchers && vouchers.length > 0 ? vouchers : this.scan();
    if (this.downloadVouchersList.length === 0) {
      console.warn('[Kattxo SRI] No hay comprobantes disponibles para descargar.');
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

  private triggerDownloadForVoucher(voucher: SriVoucher, index: number): boolean {
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

    // Actualizar widget in-page
    if (this.widget) {
      this.widget.updateProgress({
        total,
        completed,
        failed,
        currentKey,
        isPaused: this.isPaused,
        isFinished,
      });
    }

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
