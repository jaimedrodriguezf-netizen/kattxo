import {
  DownloadItem,
  QueueConfig,
  QueueState,
  QueueStats,
  SriVoucher,
  VoucherDownloadFormat,
  DEFAULT_QUEUE_CONFIG,
} from '../domain/types';
import { buildSriDownloadPath } from '../domain/validators';
import { buildSyntheticSriXml } from '../domain/syntheticXmlGenerator';
import { fetchRetentionXml, xmlToDataUrl } from './downloader';

export type ProcessItemFn = (item: DownloadItem, config: QueueConfig) => Promise<void | boolean>;

export class DownloadQueueManager {
  private items: Map<string, DownloadItem> = new Map();
  private config: QueueConfig;
  private isRunning = false;
  private isPaused = false;
  private currentActiveKey?: string;
  private listeners: Array<(state: QueueState) => void> = [];
  private processItemFn?: ProcessItemFn;

  constructor(config: Partial<QueueConfig> = {}) {
    this.config = { ...DEFAULT_QUEUE_CONFIG, ...config };
  }

  public setProcessItemFn(fn: ProcessItemFn): void {
    this.processItemFn = fn;
  }

  public onStateChange(listener: (state: QueueState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public enqueue(
    vouchers: SriVoucher[],
    options: { format?: VoucherDownloadFormat } = {}
  ): void {
    const format: VoucherDownloadFormat = options.format || 'xml';
    for (const voucher of vouchers) {
      const itemId = `${voucher.claveAcceso}_${format}`;
      const existing = this.items.get(itemId);
      if (!existing || existing.status === 'failed') {
        this.items.set(itemId, {
          id: itemId,
          voucher,
          format,
          status: 'pending',
          retryCount: 0,
          maxRetries: this.config.maxRetries,
          addedAt: Date.now(),
        });
      }
    }
    this.notifyState();
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;
    this.notifyState();

    try {
      while (this.isRunning && !this.isPaused) {
        const nextItem = this.getNextPendingItem();
        if (!nextItem) {
          // No hay más ítems pendientes
          break;
        }

        this.currentActiveKey = nextItem.id;
        nextItem.status = 'downloading';
        this.notifyState();

        let success = false;
        let lastError: string | undefined;

        while (!success && nextItem.retryCount <= nextItem.maxRetries) {
          try {
            if (this.processItemFn) {
              await this.processItemFn(nextItem, this.config);
            } else {
              await this.defaultProcessItem(nextItem);
            }
            success = true;
          } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            lastError = errorMsg;
            nextItem.retryCount++;
            if (nextItem.retryCount <= nextItem.maxRetries) {
              // Espera antes del reintento
              await this.sleep(this.config.delayBetweenRequestsMs * nextItem.retryCount);
            }
          }
        }

        if (success) {
          nextItem.status = 'completed';
          nextItem.completedAt = Date.now();
          nextItem.error = undefined;
        } else {
          nextItem.status = 'failed';
          nextItem.error = lastError;
        }

        this.currentActiveKey = undefined;
        this.notifyState();

        // Throttling entre peticiones sucesivas para cuidar la sesión del SRI
        if (this.getNextPendingItem() && !this.isPaused) {
          await this.sleep(this.config.delayBetweenRequestsMs);
        }
      }
    } finally {
      this.isRunning = false;
      this.currentActiveKey = undefined;
      this.notifyState();
    }
  }

  public pause(): void {
    this.isPaused = true;
    this.isRunning = false;
    this.notifyState();
  }

  public resume(): void {
    this.isPaused = false;
    this.notifyState();
  }

  public clear(): void {
    this.items.clear();
    this.isRunning = false;
    this.isPaused = false;
    this.currentActiveKey = undefined;
    this.notifyState();
  }

  public getState(): QueueState {
    const itemsArray = Array.from(this.items.values());
    const stats: QueueStats = {
      total: itemsArray.length,
      pending: itemsArray.filter((i) => i.status === 'pending').length,
      downloading: itemsArray.filter((i) => i.status === 'downloading').length,
      completed: itemsArray.filter((i) => i.status === 'completed').length,
      failed: itemsArray.filter((i) => i.status === 'failed').length,
      isPaused: this.isPaused,
      isRunning: this.isRunning,
    };

    return {
      items: itemsArray,
      stats,
      currentActiveKey: this.currentActiveKey,
    };
  }

  private getNextPendingItem(): DownloadItem | undefined {
    for (const item of this.items.values()) {
      if (item.status === 'pending') {
        return item;
      }
    }
    return undefined;
  }

  private async defaultProcessItem(item: DownloadItem): Promise<void> {
    const format = (item.format || 'xml').toLowerCase() as 'xml' | 'pdf';
    const filename = buildSriDownloadPath(item.voucher, {
      taxpayerRuc: item.voucher.rucEmisor,
      format,
      baseDirectory: this.config.downloadSubdirectory || 'Kattxo',
    });

    let downloadUrl = '';
    if (item.voucher.categoria === 'emitidos' && format === 'xml') {
      const xmlContent = buildSyntheticSriXml(item.voucher);
      downloadUrl = xmlToDataUrl(xmlContent);
    } else {
      const tipo = item.voucher.tipoComprobante || '01';
      downloadUrl =
        format === 'pdf'
          ? `https://srienlinea.sri.gob.ec/comprobantes-electronicos-internet/descargaRide?claveAcceso=${item.voucher.claveAcceso}&tipo=${tipo}`
          : `https://srienlinea.sri.gob.ec/comprobantes-electronicos-internet/descargaXml?claveAcceso=${item.voucher.claveAcceso}&tipo=${tipo}`;
    }

    if (typeof chrome !== 'undefined' && chrome.downloads?.download) {
      await new Promise<number>((resolve, reject) => {
        chrome.downloads.download(
          {
            url: downloadUrl,
            filename,
            conflictAction: 'overwrite',
            saveAs: false,
          },
          (downloadId) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else if (downloadId === undefined) {
              reject(new Error('Fallo al iniciar descarga en chrome.downloads'));
            } else {
              resolve(downloadId);
            }
          }
        );
      });
    }
  }

  private notifyState(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.error('Error notifying queue listener:', err);
      }
    });

    // Guardar en chrome.storage.local si está disponible
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ kattxo_queue_state: state }).catch(() => {
        // Ignorar si el storage no está accesible
      });
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
