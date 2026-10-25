import {
  extractRetentionsFromDom,
  extractVouchersFromDom,
  extractTaxpayerProfileFromDom,
} from './parser';
import { InPageWidget } from './inPageWidget';
import { triggerSriTxtReportDownload } from './formAutomator';
import { BatchQueryRunner } from './batchQueryRunner';
import { vouchersToCsv } from '../domain/csvExporter';
import { generateDateRangeSteps } from '../domain/dateRangeIterator';
import { HistoryManager } from '../domain/historyManager';
import {
  ExtensionMessage,
  RetentionsDetectedMessage,
  MessageResponse,
  DownloadProgressUpdateMessage,
} from '../domain/messages';
import { RetentionVoucher, SriVoucher, TaxpayerProfile } from '../domain/types';

class SriContentScript {
  private lastDetectedKeys: Set<string> = new Set();
  private observer: MutationObserver | null = null;
  private debounceTimer: number | null = null;
  private pollingTimer: number | null = null;
  private widget: InPageWidget | null = null;
  private currentTaxpayerProfile: TaxpayerProfile | null = null;
  private batchRunner: BatchQueryRunner | null = null;

  // Estado de descarga en página
  private isDownloading = false;
  private isPaused = false;
  private currentDownloadIndex = 0;
  private downloadVouchersList: SriVoucher[] = [];

  public init(): void {
    console.log('[Kattxo SRI] Content script inicializado en:', window.location.href);
    this.initWidget();
    this.checkAutoResumeState();
    this.scanAndNotify();
    this.setupMutationObserver();
    this.setupPolling();
    this.setupMessageListener();
  }

  private async checkAutoResumeState(): Promise<void> {
    try {
      const historyManager = new HistoryManager();
      const autoResume = await historyManager.getAutoResumeState();
      if (autoResume && autoResume.pendingVouchers && autoResume.pendingVouchers.length > 0) {
        console.log(`[Kattxo SRI] Lote previo pendiente detectado: ${autoResume.pendingVouchers.length} comprobantes.`);
        this.widget?.showResumeBanner(
          autoResume.pendingVouchers.length,
          () => {
            console.log('[Kattxo SRI] Reanudando lote desde banner...');
            this.widget?.hideResumeBanner();
            this.startBulkDownload(autoResume.pendingVouchers);
          },
          () => {
            historyManager.clearAutoResumeState();
          }
        );
      }
    } catch (err) {
      console.warn('[Kattxo SRI] Error verificando auto-reanudación:', err);
    }
  }

  private initWidget(): void {
    if (typeof document === 'undefined') return;
    this.widget = new InPageWidget({
      onStartDownload: (docType, format) => {
        if (format === 'TXT') {
          this.downloadSriTxtReport();
          return;
        }
        const vouchers = this.scan(docType);
        this.startBulkDownload(vouchers, format === 'PDF' ? 'PDF' : 'XML');
      },
      onPauseDownload: () => this.pauseBulkDownload(),
      onResumeDownload: () => this.resumeBulkDownload(),
      onExportCsv: () => this.exportDetectedToCsv(),
      onDownloadTxtReport: () => this.downloadSriTxtReport(),
      onStartBatchRange: (params) => {
        if (params.format === 'TXT') {
          this.downloadSriTxtReport();
          return;
        }
        this.startBatchRangeDownload(params);
      },
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
    if (profile) {
      this.currentTaxpayerProfile = profile;
      if (this.widget) {
        this.widget.setTaxpayerProfile(profile);
      }
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

  public exportDetectedToCsv(): void {
    const vouchers = this.scan();
    if (vouchers.length === 0) {
      console.warn('[Kattxo SRI] No hay comprobantes detectados para exportar.');
      return;
    }

    const csvContent = vouchersToCsv(vouchers);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const ruc = this.currentTaxpayerProfile?.ruc || 'SRI';
    link.download = `reporte_comprobantes_${ruc}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    console.log(`[Kattxo SRI] Reporte CSV exportado exitosamente (${vouchers.length} registros).`);
  }

  public downloadSriTxtReport(): void {
    triggerSriTxtReportDownload(document);
  }

  public async startBatchRangeDownload(params: { from: string; to: string; documentType: string }): Promise<void> {
    const steps = generateDateRangeSteps(params.from, params.to);
    if (steps.length === 0) {
      console.warn('[Kattxo SRI] Rango de fechas inválido:', params);
      return;
    }

    console.log(`[Kattxo SRI] Iniciando consulta continua de ${steps.length} fechas...`);
    this.widget?.setStatusText(`Lote iniciado: ${steps.length} fechas`);

    this.batchRunner = new BatchQueryRunner({
      steps,
      documentType: params.documentType === 'ALL' ? undefined : params.documentType,
      onStepStart: (step, current, total) => {
        this.widget?.setStatusText(`Consultando ${step.formattedLabel} (${current}/${total})...`);
      },
      onVouchersFound: (newVouchers, step) => {
        console.log(`[Kattxo SRI] ${newVouchers.length} comprobantes detectados para ${step.formattedLabel}`);
        this.startBulkDownload(newVouchers);
      },
    });

    const result = await this.batchRunner.run();
    this.widget?.setStatusText(`Completado: ${result.totalFound} comprobantes encontrados`);
    console.log(`[Kattxo SRI] Consulta continua finalizada con estado: ${result.status}`);
  }

  public async startBulkDownload(
    vouchers?: SriVoucher[],
    format: 'XML' | 'PDF' = 'XML'
  ): Promise<void> {
    if (this.isDownloading) return;

    this.downloadVouchersList = vouchers && vouchers.length > 0 ? vouchers : this.scan();
    if (this.downloadVouchersList.length === 0) {
      console.warn('[Kattxo SRI] No hay comprobantes disponibles para descargar.');
      return;
    }

    this.widget?.clearDownloadList();
    this.isDownloading = true;
    this.isPaused = false;
    this.currentDownloadIndex = 0;

    let completed = 0;
    let failed = 0;
    let consecutiveFailures = 0;

    console.log(`[Kattxo SRI] Iniciando descarga de ${this.downloadVouchersList.length} retenciones vía JSF...`);

    while (this.currentDownloadIndex < this.downloadVouchersList.length && !this.isPaused) {
      const voucher = this.downloadVouchersList[this.currentDownloadIndex];
      this.broadcastProgress(this.downloadVouchersList.length, completed, failed, voucher.claveAcceso, false);

      this.widget?.addDownloadItem(voucher, 'downloading');
      const success = this.triggerDownloadForVoucher(voucher, this.currentDownloadIndex, format);
      if (success) {
        completed++;
        consecutiveFailures = 0;
        this.widget?.updateItemStatus(voucher.claveAcceso, 'completed');
      } else {
        failed++;
        consecutiveFailures++;
        this.widget?.updateItemStatus(voucher.claveAcceso, 'failed');
        if (consecutiveFailures >= 3) {
          console.warn(
            '[Kattxo SRI] ⚠️ Circuit breaker activado: 3 fallos consecutivos detectados (posible caída de sesión del SRI).'
          );
          this.isDownloading = false;
          this.isPaused = true;
          await this.handleCircuitBreakerTriggered(completed, failed);
          return;
        }
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

    // Registrar en el historial de sesiones para auditoría y reanudación
    try {
      const historyManager = new HistoryManager();
      const pendingVouchers = this.downloadVouchersList.slice(this.currentDownloadIndex);
      const status = isFinished && failed === 0 ? 'completed' : isFinished ? 'partial' : 'interrupted';
      await historyManager.saveSessionRecord({
        id: `session-${Date.now()}`,
        timestamp: Date.now(),
        taxpayerRuc: this.currentTaxpayerProfile?.ruc || 'SRI',
        taxpayerName: this.currentTaxpayerProfile?.razonSocial,
        documentType: 'ALL',
        totalVouchers: this.downloadVouchersList.length,
        completedVouchers: completed,
        failedVouchers: failed,
        status,
        pendingVouchers,
      });

      // Notificar al background para emitir notificación de escritorio
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'BATCH_COMPLETED_NOTIFICATION',
          payload: {
            total: this.downloadVouchersList.length,
            completed,
            failed,
          },
        });
      }
    } catch (err) {
      console.warn('[Kattxo SRI] Error guardando registro en historial:', err);
    }
  }

  private async handleCircuitBreakerTriggered(completed: number, failed: number): Promise<void> {
    const remaining = this.downloadVouchersList.slice(this.currentDownloadIndex + 1);
    const historyManager = new HistoryManager();
    const sessionId = `session-${Date.now()}`;

    try {
      await historyManager.saveSessionRecord({
        id: sessionId,
        timestamp: Date.now(),
        taxpayerRuc: this.currentTaxpayerProfile?.ruc || 'SRI',
        taxpayerName: this.currentTaxpayerProfile?.razonSocial,
        documentType: 'ALL',
        totalVouchers: this.downloadVouchersList.length,
        completedVouchers: completed,
        failedVouchers: failed,
        status: 'interrupted',
        pendingVouchers: remaining,
      });

      if (remaining.length > 0) {
        await historyManager.saveAutoResumeState({
          id: sessionId,
          timestamp: Date.now(),
          taxpayerRuc: this.currentTaxpayerProfile?.ruc || 'SRI',
          pendingVouchers: remaining,
          totalOriginal: this.downloadVouchersList.length,
          completedSoFar: completed,
        });

        this.widget?.showResumeBanner(remaining.length, () => {
          this.widget?.hideResumeBanner();
          this.startBulkDownload(remaining);
        });
      }

      this.widget?.setStatusText('⚠️ Sesión interrumpida por fallos. Reanudá al reingresar.');
      this.broadcastProgress(this.downloadVouchersList.length, completed, failed, undefined, false);

      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'BATCH_COMPLETED_NOTIFICATION',
          payload: {
            total: this.downloadVouchersList.length,
            completed,
            failed,
          },
        });
      }
    } catch (err) {
      console.warn('[Kattxo SRI] Error procesando circuit breaker:', err);
    }
  }

  private triggerDownloadForVoucher(
    voucher: SriVoucher,
    index: number,
    format: 'XML' | 'PDF' = 'XML'
  ): boolean {
    try {
      if (format === 'PDF') {
        if (voucher.elementPdfId) {
          const el = document.getElementById(voucher.elementPdfId);
          if (el) {
            el.click();
            return true;
          }
        }
        const indexedPdfId = `frmPrincipal:tablaCompRecibidos:${index}:lnkPdf`;
        const indexedPdfEl = document.getElementById(indexedPdfId);
        if (indexedPdfEl) {
          indexedPdfEl.click();
          return true;
        }
        const allPdfLinks = document.querySelectorAll<HTMLElement>(
          'a[id*="lnkPdf"], a[id*="lnkRide"], a[title*="ride" i], a[title*="pdf" i]'
        );
        if (allPdfLinks[index]) {
          allPdfLinks[index].click();
          return true;
        }
      }

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
    this.batchRunner?.pause();
    this.broadcastProgress(this.downloadVouchersList.length, this.currentDownloadIndex, 0, undefined, false);
  }

  public resumeBulkDownload(): void {
    if (this.isPaused) {
      this.isPaused = false;
      this.batchRunner?.resume();
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

        if (message.type === 'DOWNLOAD_SRI_TXT_REQUEST') {
          this.downloadSriTxtReport();
          sendResponse({ success: true, data: { status: 'txt_requested' } });
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
