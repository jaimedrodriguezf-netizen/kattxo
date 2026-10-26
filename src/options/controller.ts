import { HistoryManager, DownloadSessionRecord, UserPreferences } from '../domain/historyManager';
import { SriVoucher } from '../domain/types';
import { parseSriTxtReport } from '../domain/sriTxtParser';
import { reconcileVouchers, reconciliationToCsv } from '../domain/voucherReconciler';
import { formatCustomFilename } from '../domain/filenameFormatter';

export class OptionsController {
  private historyManager: HistoryManager;
  private parsedImportVouchers: SriVoucher[] = [];

  constructor(historyManager: HistoryManager = new HistoryManager()) {
    this.historyManager = historyManager;
  }

  public async init(): Promise<void> {
    this.setupTabs();
    this.setupSettingsForm();
    this.setupHistoryActions();
    this.setupImportTab();
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
    const patternInput = document.getElementById('setting-filename-pattern') as HTMLInputElement | null;

    if (subdirInput) subdirInput.value = prefs.downloadSubdirectory;
    if (throttleInput) throttleInput.value = prefs.throttlingDelayMs.toString();
    if (pdfCheckbox) pdfCheckbox.checked = prefs.downloadPdfRide;
    if (patternInput) {
      patternInput.value = prefs.filenamePattern || '{tipo}_{clave}';
      this.updatePatternPreview(patternInput.value);
    }
  }

  public updatePatternPreview(pattern: string): void {
    const previewEl = document.getElementById('pattern-preview-text');
    if (!previewEl) return;
    const sampleFilename = formatCustomFilename(pattern, {
      tipo: 'factura',
      tipoCode: '01',
      clave: '0101202401019000000000120010010000000011234567813',
      ruc: '0190000000001',
      numero: '001-001-000000001',
      secuencial: '000000001',
      fecha: '2024-01-01',
      razonSocial: 'COMERCIAL ANDINA S.A.',
    });
    previewEl.textContent = `${sampleFilename}.xml`;
  }

  public setupSettingsForm(): void {
    const form = document.getElementById('settings-form');
    const patternInput = document.getElementById('setting-filename-pattern') as HTMLInputElement | null;
    const presetButtons = document.querySelectorAll<HTMLButtonElement>('.btn-pattern-preset');

    patternInput?.addEventListener('input', () => {
      this.updatePatternPreview(patternInput.value);
    });

    presetButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = btn.getAttribute('data-preset');
        if (preset && patternInput) {
          patternInput.value = preset;
          this.updatePatternPreview(preset);
        }
      });
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const subdirInput = document.getElementById('setting-subdir') as HTMLInputElement | null;
      const throttleInput = document.getElementById('setting-throttle') as HTMLInputElement | null;
      const pdfCheckbox = document.getElementById('setting-download-pdf') as HTMLInputElement | null;

      const newPrefs: Partial<UserPreferences> = {
        downloadSubdirectory: subdirInput?.value.trim() || 'Kattxo',
        throttlingDelayMs: parseInt(throttleInput?.value || '1200', 10),
        downloadPdfRide: !!pdfCheckbox?.checked,
        filenamePattern: patternInput?.value.trim() || '{tipo}_{clave}',
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

  public setupImportTab(): void {
    const dropZone = document.getElementById('txt-drop-zone');
    const fileInput = document.getElementById('input-txt-file') as HTMLInputElement | null;
    const startBtn = document.getElementById('btn-start-import-download');

    dropZone?.addEventListener('click', () => {
      fileInput?.click();
    });

    fileInput?.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          if (content) {
            this.handleTxtContent(content, file.name);
          }
          fileInput.value = '';
        };
        reader.readAsText(file);
      }
    });

    dropZone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--primary)';
    });
    dropZone?.addEventListener('dragleave', () => {
      dropZone.style.borderColor = 'var(--border)';
    });
    dropZone?.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--border)';
      const file = e.dataTransfer?.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const content = evt.target?.result as string;
          if (content) {
            this.handleTxtContent(content, file.name);
          }
        };
        reader.readAsText(file);
      }
    });

    startBtn?.addEventListener('click', async () => {
      if (this.parsedImportVouchers.length === 0) {
        alert('No hay comprobantes cargados para descargar.');
        return;
      }
      const formatSelect = document.getElementById('import-format-select') as HTMLSelectElement | null;
      const format = (formatSelect?.value || 'xml').toUpperCase() as 'XML' | 'PDF';

      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'ENQUEUE_VOUCHERS',
          payload: {
            vouchers: this.parsedImportVouchers,
            format,
          },
        });
        alert(`Iniciada descarga de ${this.parsedImportVouchers.length} comprobantes en formato ${format}.`);
      } else {
        alert(`Descarga simulada para ${this.parsedImportVouchers.length} comprobantes (${format}).`);
      }
    });

    const exportCsvBtn = document.getElementById('btn-export-reconciliation-csv');
    exportCsvBtn?.addEventListener('click', async () => {
      if (this.parsedImportVouchers.length === 0) {
        alert('Cargá primero un reporte TXT del SRI.');
        return;
      }
      const history = await this.historyManager.getHistory();
      const allDownloaded: SriVoucher[] = [];
      history.forEach((rec) => {
        if (rec.pendingVouchers) {
          // Si hay pendientes, los que no están pendientes son completados
        }
      });
      const result = reconcileVouchers(this.parsedImportVouchers, allDownloaded);
      const csv = reconciliationToCsv(result);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conciliacion_sri_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  public handleTxtContent(rawContent: string, filename: string): void {
    const isEmitidos = filename.toLowerCase().includes('emitido');
    const category = isEmitidos ? 'emitidos' : 'recibidos';
    this.parsedImportVouchers = parseSriTxtReport(rawContent, category);

    const previewContainer = document.getElementById('import-preview-container');
    const summaryTitle = document.getElementById('import-summary-title');
    const tbody = document.getElementById('import-preview-tbody');

    if (!previewContainer || !tbody) return;

    if (this.parsedImportVouchers.length === 0) {
      alert('No se encontraron claves de acceso de 49 dígitos válidas en el archivo TXT cargado.');
      previewContainer.style.display = 'none';
      return;
    }

    previewContainer.style.display = 'block';
    if (summaryTitle) {
      summaryTitle.textContent = `Comprobantes Detectados: ${this.parsedImportVouchers.length} comprobante(s) en ${filename}`;
    }

    tbody.innerHTML = '';
    const previewItems = this.parsedImportVouchers.slice(0, 100);
    previewItems.forEach((v) => {
      const tr = document.createElement('tr');
      const totalStr = v.totalImporte !== undefined ? `$ ${v.totalImporte.toFixed(2)}` : '-';
      tr.innerHTML = `
        <td>${v.fechaEmision}</td>
        <td><code>${v.rucEmisor}</code></td>
        <td>${v.razonSocialEmisor || '-'}</td>
        <td><strong>${v.numeroComprobante}</strong></td>
        <td>${totalStr}</td>
        <td><small><code>${v.claveAcceso}</code></small></td>
      `;
      tbody.appendChild(tr);
    });
  }

  public getParsedImportVouchers(): SriVoucher[] {
    return this.parsedImportVouchers;
  }
}
