import {
  DownloadItem,
  QueueConfig,
  QueueState,
  QueueStats,
  RetentionVoucher,
  DEFAULT_QUEUE_CONFIG,
} from '../domain/types';
import { buildXmlFilename } from '../domain/validators';
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

  public enqueue(vouchers: RetentionVoucher[]): void {
    for (const voucher of vouchers) {
      const existing = this.items.get(voucher.claveAcceso);
      if (!existing || existing.status === 'failed') {
        this.items.set(voucher.claveAcceso, {
          id: voucher.claveAcceso,
          voucher,
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
    const { xmlContent } = await fetchRetentionXml(item.voucher.claveAcceso);
    const dataUrl = xmlToDataUrl(xmlContent);
    const filename = buildXmlFilename(item.voucher, this.config.downloadSubdirectory);

    if (typeof chrome !== 'undefined' && chrome.downloads?.download) {
      await new Promise<number>((resolve, reject) => {
        chrome.downloads.download(
          {
            url: dataUrl,
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
