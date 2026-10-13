import {
  ExtensionMessage,
  GetQueueStateMessage,
  MessageResponse,
  ScanPageRequestMessage,
  StartInPageDownloadMessage,
  PauseInPageDownloadMessage,
  ResumeInPageDownloadMessage,
} from '../domain/messages';
import { QueueState, QueueStats, RetentionVoucher } from '../domain/types';

export function calculateProgressPercentage(stats: QueueStats): number {
  if (!stats || stats.total === 0) return 0;
  const processed = stats.completed + stats.failed;
  return Math.min(100, Math.round((processed / stats.total) * 100));
}

export function formatProgressRatio(stats: QueueStats): string {
  if (!stats) return '0 / 0';
  const processed = stats.completed + stats.failed;
  return `${processed} / ${stats.total}`;
}

export class PopupController {
  private detectedRetenciones: RetentionVoucher[] = [];
  private queueState: QueueState | null = null;
  private isSriTab = false;
  private activeTabId?: number;

  public async init(): Promise<void> {
    this.setupListeners();
    await this.checkCurrentTab();
    await this.loadInitialData();
    if (this.isSriTab) {
      await this.scanCurrentTab();
    }
  }

  private setupListeners(): void {
    document.getElementById('btn-scan')?.addEventListener('click', () => this.scanCurrentTab());
    document.getElementById('btn-start')?.addEventListener('click', () => this.startDownload());
    document.getElementById('btn-pause')?.addEventListener('click', () => this.togglePause());
    document.getElementById('btn-clear')?.addEventListener('click', () => this.clearQueue());

    // Escuchar mensajes broadcast del Background y del Content Script
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
        if (message.type === 'QUEUE_STATE_CHANGED') {
          this.queueState = message.payload;
          this.render();
        } else if (message.type === 'DOWNLOAD_PROGRESS_UPDATE') {
          const { total, completed, failed, currentKey, isPaused, isFinished } = message.payload;
          const pending = Math.max(0, total - (completed + failed));
          this.queueState = {
            items: [],
            stats: {
              total,
              pending,
              downloading: currentKey ? 1 : 0,
              completed,
              failed,
              isPaused,
              isRunning: !isFinished && !isPaused,
            },
            currentActiveKey: currentKey,
          };
          this.render();
        }
      });
    }
  }

  private async checkCurrentTab(): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.tabs?.query) return;

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      this.activeTabId = currentTab?.id;
      const url = currentTab?.url || '';
      this.isSriTab = url.includes('srienlinea.sri.gob.ec');
    } catch {
      this.isSriTab = false;
    }
    this.render();
  }

  private async loadInitialData(): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      try {
        const stored = await chrome.storage.local.get(['kattxo_last_detected', 'kattxo_queue_state']);
        if (stored.kattxo_last_detected) {
          this.detectedRetenciones = stored.kattxo_last_detected;
        }
        if (stored.kattxo_queue_state) {
          this.queueState = stored.kattxo_queue_state;
        }
      } catch (err) {
        console.warn('Error reading storage:', err);
      }
    }

    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      const msg: GetQueueStateMessage = { type: 'GET_QUEUE_STATE' };
      chrome.runtime.sendMessage(msg, (response: MessageResponse<{ queueState: QueueState }>) => {
        if (chrome.runtime.lastError) return;
        if (response?.success && response.data?.queueState) {
          this.queueState = response.data.queueState;
          this.render();
        }
      });
    }

    this.render();
  }

  public async scanCurrentTab(): Promise<void> {
    if (typeof chrome === 'undefined' || !this.activeTabId) return;

    const msg: ScanPageRequestMessage = { type: 'SCAN_PAGE_REQUEST' };
    chrome.tabs.sendMessage(this.activeTabId, msg, (response: MessageResponse<{ retenciones: RetentionVoucher[] }>) => {
      if (chrome.runtime.lastError) return;
      if (response?.success && response.data) {
        this.detectedRetenciones = response.data.retenciones;
        this.render();
      }
    });
  }

  public startDownload(): void {
    if (typeof chrome === 'undefined' || !this.activeTabId) return;

    // Disparar la descarga en la página que tiene la sesión JSF / Mojarra activa
    const msg: StartInPageDownloadMessage = {
      type: 'START_IN_PAGE_DOWNLOAD',
      payload: { retenciones: this.detectedRetenciones },
    };

    chrome.tabs.sendMessage(this.activeTabId, msg, (response: MessageResponse<{ status: string }>) => {
      if (chrome.runtime.lastError) return;
      if (response?.success) {
        this.queueState = {
          items: [],
          stats: {
            total: this.detectedRetenciones.length,
            pending: this.detectedRetenciones.length,
            downloading: 1,
            completed: 0,
            failed: 0,
            isPaused: false,
            isRunning: true,
          },
        };
        this.render();
      }
    });
  }

  public togglePause(): void {
    if (typeof chrome === 'undefined' || !this.activeTabId || !this.queueState) return;

    if (this.queueState.stats.isPaused) {
      const msg: ResumeInPageDownloadMessage = { type: 'RESUME_IN_PAGE_DOWNLOAD' };
      chrome.tabs.sendMessage(this.activeTabId, msg, (res: MessageResponse<{ status: string }>) => {
        if (chrome.runtime.lastError) return;
        if (res?.success && this.queueState) {
          this.queueState.stats.isPaused = false;
          this.queueState.stats.isRunning = true;
          this.render();
        }
      });
    } else {
      const msg: PauseInPageDownloadMessage = { type: 'PAUSE_IN_PAGE_DOWNLOAD' };
      chrome.tabs.sendMessage(this.activeTabId, msg, (res: MessageResponse<{ status: string }>) => {
        if (chrome.runtime.lastError) return;
        if (res?.success && this.queueState) {
          this.queueState.stats.isPaused = true;
          this.queueState.stats.isRunning = false;
          this.render();
        }
      });
    }
  }

  public clearQueue(): void {
    this.queueState = null;
    this.render();
  }

  public render(): void {
    const badgeEl = document.getElementById('connection-badge');
    if (badgeEl) {
      if (this.isSriTab) {
        badgeEl.textContent = 'SRI Conectado';
        badgeEl.className = 'badge badge-online';
      } else {
        badgeEl.textContent = 'Portal SRI inactivo';
        badgeEl.className = 'badge badge-offline';
      }
    }

    const countEl = document.getElementById('detected-count');
    if (countEl) {
      countEl.textContent = String(this.detectedRetenciones.length);
    }

    const hintEl = document.getElementById('page-hint');
    if (hintEl) {
      if (this.isSriTab) {
        hintEl.textContent =
          this.detectedRetenciones.length > 0
            ? 'Retenciones listas para descargar.'
            : 'No se detectaron retenciones en esta vista del SRI.';
      } else {
        hintEl.textContent = 'Navegá a la sección de retenciones en srienlinea.sri.gob.ec';
      }
    }

    const stats = this.queueState?.stats || {
      total: 0,
      pending: 0,
      downloading: 0,
      completed: 0,
      failed: 0,
      isPaused: false,
      isRunning: false,
    };

    const percentage = calculateProgressPercentage(stats);
    const ratio = formatProgressRatio(stats);

    const barFill = document.getElementById('progress-bar-fill');
    if (barFill) barFill.style.width = `${percentage}%`;

    const percentageEl = document.getElementById('progress-percentage');
    if (percentageEl) percentageEl.textContent = `${percentage}%`;

    const ratioEl = document.getElementById('progress-ratio');
    if (ratioEl) ratioEl.textContent = ratio;

    const statTotal = document.getElementById('stat-total');
    if (statTotal) statTotal.textContent = String(stats.total);

    const statPending = document.getElementById('stat-pending');
    if (statPending) statPending.textContent = String(stats.pending);

    const statCompleted = document.getElementById('stat-completed');
    if (statCompleted) statCompleted.textContent = String(stats.completed);

    const statFailed = document.getElementById('stat-failed');
    if (statFailed) statFailed.textContent = String(stats.failed);

    const statusTextEl = document.getElementById('queue-status-text');
    if (statusTextEl) {
      if (stats.isRunning) {
        statusTextEl.textContent = 'Descargando...';
        statusTextEl.className = 'status-label text-success';
      } else if (stats.isPaused) {
        statusTextEl.textContent = 'En pausa';
        statusTextEl.className = 'status-label';
      } else if (stats.total > 0 && stats.pending === 0) {
        statusTextEl.textContent = 'Completado';
        statusTextEl.className = 'status-label text-success';
      } else {
        statusTextEl.textContent = 'Inactivo';
        statusTextEl.className = 'status-label';
      }
    }

    const activeBox = document.getElementById('active-item-box');
    const activeText = document.getElementById('active-item-text');
    if (activeBox && activeText) {
      if (this.queueState?.currentActiveKey && stats.isRunning) {
        activeBox.classList.remove('hidden');
        activeText.textContent = `Descargando XML: ...${this.queueState.currentActiveKey.slice(-12)}`;
      } else {
        activeBox.classList.add('hidden');
      }
    }

    const btnStart = document.getElementById('btn-start') as HTMLButtonElement | null;
    if (btnStart) {
      const hasSomethingToStart = this.detectedRetenciones.length > 0 || stats.pending > 0;
      btnStart.disabled = !hasSomethingToStart || stats.isRunning;
    }

    const btnPause = document.getElementById('btn-pause') as HTMLButtonElement | null;
    if (btnPause) {
      btnPause.disabled = !stats.isRunning && !stats.isPaused;
      btnPause.textContent = stats.isPaused ? 'Reanudar' : 'Pausar';
    }

    const btnClear = document.getElementById('btn-clear') as HTMLButtonElement | null;
    if (btnClear) {
      btnClear.disabled = stats.total === 0 || stats.isRunning;
    }

    const errorSection = document.getElementById('error-section');
    if (errorSection) {
      errorSection.classList.add('hidden');
    }
  }
}
