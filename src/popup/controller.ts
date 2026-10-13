import {
  ExtensionMessage,
  GetQueueStateMessage,
  MessageResponse,
  PauseDownloadQueueMessage,
  ResumeDownloadQueueMessage,
  StartDownloadQueueMessage,
  ClearQueueMessage,
  ScanPageRequestMessage,
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

  public async init(): Promise<void> {
    this.setupListeners();
    await this.checkCurrentTab();
    await this.loadInitialData();
    if (this.isSriTab) {
      await this.scanCurrentTab();
    }
  }

  private setupListeners(): void {
    // Botones
    document.getElementById('btn-scan')?.addEventListener('click', () => this.scanCurrentTab());
    document.getElementById('btn-start')?.addEventListener('click', () => this.startDownload());
    document.getElementById('btn-pause')?.addEventListener('click', () => this.togglePause());
    document.getElementById('btn-clear')?.addEventListener('click', () => this.clearQueue());

    // Escuchar mensajes broadcast del Background
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
        if (message.type === 'QUEUE_STATE_CHANGED') {
          this.queueState = message.payload;
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
      const url = currentTab?.url || '';
      this.isSriTab = url.includes('srienlinea.sri.gob.ec');
    } catch {
      this.isSriTab = false;
    }
    this.render();
  }

  private async loadInitialData(): Promise<void> {
    // 1. Cargar último estado detectado de storage local
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

    // 2. Consultar estado fresco al background
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      const msg: GetQueueStateMessage = { type: 'GET_QUEUE_STATE' };
      chrome.runtime.sendMessage(msg, (response: MessageResponse<{ queueState: QueueState }>) => {
        if (chrome.runtime.lastError) {
          return;
        }
        if (response?.success && response.data?.queueState) {
          this.queueState = response.data.queueState;
          this.render();
        }
      });
    }

    this.render();
  }

  public async scanCurrentTab(): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.tabs?.query) return;

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tabId = tabs[0]?.id;
    if (!tabId) return;

    const msg: ScanPageRequestMessage = { type: 'SCAN_PAGE_REQUEST' };
    chrome.tabs.sendMessage(tabId, msg, (response: MessageResponse<{ retenciones: RetentionVoucher[] }>) => {
      if (chrome.runtime.lastError) {
        // La pestaña fue abierta antes de recargar la extensión y requiere F5
        return;
      }
      if (response?.success && response.data) {
        this.detectedRetenciones = response.data.retenciones;
        this.render();
      }
    });
  }

  public startDownload(): void {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;

    const msg: StartDownloadQueueMessage = {
      type: 'START_DOWNLOAD_QUEUE',
      payload: { retenciones: this.detectedRetenciones },
    };

    chrome.runtime.sendMessage(msg, (response: MessageResponse<QueueState>) => {
      if (chrome.runtime.lastError) return;
      if (response?.success && response.data) {
        this.queueState = response.data;
        this.render();
      }
    });
  }

  public togglePause(): void {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage || !this.queueState) return;

    if (this.queueState.stats.isPaused) {
      const msg: ResumeDownloadQueueMessage = { type: 'RESUME_DOWNLOAD_QUEUE' };
      chrome.runtime.sendMessage(msg, (res: MessageResponse<QueueState>) => {
        if (chrome.runtime.lastError) return;
        if (res?.success && res.data) {
          this.queueState = res.data;
          this.render();
        }
      });
    } else {
      const msg: PauseDownloadQueueMessage = { type: 'PAUSE_DOWNLOAD_QUEUE' };
      chrome.runtime.sendMessage(msg, (res: MessageResponse<QueueState>) => {
        if (chrome.runtime.lastError) return;
        if (res?.success && res.data) {
          this.queueState = res.data;
          this.render();
        }
      });
    }
  }

  public clearQueue(): void {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;

    const msg: ClearQueueMessage = { type: 'CLEAR_QUEUE' };
    chrome.runtime.sendMessage(msg, (res: MessageResponse<QueueState>) => {
      if (chrome.runtime.lastError) return;
      if (res?.success && res.data) {
        this.queueState = res.data;
        this.render();
      }
    });
  }

  public render(): void {
    // 1. Connection Badge
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

    // 2. Detección
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

    // 3. Stats & Progreso
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

    // 4. Estado de texto & item activo
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

    // 5. Botones
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

    // 6. Lista de errores
    const errorSection = document.getElementById('error-section');
    const errorList = document.getElementById('error-list');
    if (errorSection && errorList) {
      const failedItems = this.queueState?.items.filter((i) => i.status === 'failed') || [];
      if (failedItems.length > 0) {
        errorSection.classList.remove('hidden');
        errorList.innerHTML = failedItems
          .slice(-5)
          .map((i) => `<li>${i.voucher.numeroComprobante || i.id.slice(-8)}: ${i.error || 'Fallo de descarga'}</li>`)
          .join('');
      } else {
        errorSection.classList.add('hidden');
      }
    }
  }
}
