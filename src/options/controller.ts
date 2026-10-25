import { HistoryManager, DownloadSessionRecord, UserPreferences } from '../domain/historyManager';

export class OptionsController {
  private historyManager: HistoryManager;

  constructor(historyManager: HistoryManager = new HistoryManager()) {
    this.historyManager = historyManager;
  }

  public async init(): Promise<void> {
    this.setupTabs();
    this.setupSettingsForm();
    this.setupHistoryActions();
    await this.loadPreferences();
    await this.renderHistory();
  }

  public setupTabs(): void {
    const tabButtons = document.querySelectorAll<HTMLButtonElement>('.tab-btn');
    tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-tab');
        if (!targetId) return;

        tabButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        document.querySelectorAll('.tab-content').forEach((section) => {
          section.classList.remove('active');
        });

        document.getElementById(targetId)?.classList.add('active');
      });
    });
  }

  public async loadPreferences(): Promise<void> {
    const prefs = await this.historyManager.getPreferences();
    const subdirInput = document.getElementById('setting-subdir') as HTMLInputElement | null;
    const throttleInput = document.getElementById('setting-throttle') as HTMLInputElement | null;
    const pdfCheckbox = document.getElementById('setting-download-pdf') as HTMLInputElement | null;

    if (subdirInput) subdirInput.value = prefs.downloadSubdirectory;
    if (throttleInput) throttleInput.value = prefs.throttlingDelayMs.toString();
    if (pdfCheckbox) pdfCheckbox.checked = prefs.downloadPdfRide;
  }

  public setupSettingsForm(): void {
    const form = document.getElementById('settings-form');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const subdirInput = document.getElementById('setting-subdir') as HTMLInputElement | null;
      const throttleInput = document.getElementById('setting-throttle') as HTMLInputElement | null;
      const pdfCheckbox = document.getElementById('setting-download-pdf') as HTMLInputElement | null;

      const newPrefs: Partial<UserPreferences> = {
        downloadSubdirectory: subdirInput?.value.trim() || 'Kattxo',
        throttlingDelayMs: parseInt(throttleInput?.value || '1200', 10),
        downloadPdfRide: !!pdfCheckbox?.checked,
      };

      await this.historyManager.savePreferences(newPrefs);
      alert('Configuración guardada correctamente.');
    });
  }

  public setupHistoryActions(): void {
    const clearBtn = document.getElementById('btn-clear-history');
    clearBtn?.addEventListener('click', async () => {
      if (confirm('¿Estás seguro de que deseas eliminar todo el historial de descargas?')) {
        await this.historyManager.clearHistory();
        await this.renderHistory();
      }
    });
  }

  public async renderHistory(): Promise<void> {
    const tbody = document.getElementById('history-tbody');
    const emptyState = document.getElementById('history-empty');
    if (!tbody) return;

    const history = await this.historyManager.getHistory();
    tbody.innerHTML = '';

    if (history.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    history.forEach((record) => {
      const tr = document.createElement('tr');
      const dateStr = new Date(record.timestamp).toLocaleString();
      const typeLabel = record.documentType === 'ALL' ? 'Todos' : record.documentType;
      const statusClass = `status-${record.status}`;

      tr.innerHTML = `
        <td>${dateStr}</td>
        <td><strong>${record.taxpayerRuc}</strong><br><small>${record.taxpayerName || ''}</small></td>
        <td>${typeLabel} ${record.dateRangeLabel ? `(${record.dateRangeLabel})` : ''}</td>
        <td><strong>${record.completedVouchers}</strong> / ${record.totalVouchers}</td>
        <td><span class="status-badge ${statusClass}">${record.status.toUpperCase()}</span></td>
        <td></td>
      `;

      const actionTd = tr.querySelector('td:last-child');
      if (record.pendingVouchers && record.pendingVouchers.length > 0) {
        const resumeBtn = document.createElement('button');
        resumeBtn.className = 'btn btn-outline btn-sm';
        resumeBtn.textContent = '⚡ Reanudar';
        resumeBtn.title = `Reanudar ${record.pendingVouchers.length} comprobantes pendientes`;
        resumeBtn.addEventListener('click', () => this.resumeSession(record));
        actionTd?.appendChild(resumeBtn);
      } else {
        actionTd!.textContent = '—';
      }

      tbody.appendChild(tr);
    });
  }

  public resumeSession(record: DownloadSessionRecord): void {
    if (!record.pendingVouchers || record.pendingVouchers.length === 0) return;

    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage(
        {
          type: 'START_DOWNLOAD_QUEUE',
          payload: { retenciones: record.pendingVouchers },
        },
        () => {
          alert(`Reanudando descarga de ${record.pendingVouchers.length} comprobantes en segundo plano.`);
        }
      );
    }
  }
}
