import { TaxpayerProfile } from '../domain/types';
import { getDefaultDateRange } from '../domain/dateRangeIterator';

export interface InPageProgressData {
  total: number;
  completed: number;
  failed: number;
  currentKey?: string;
  isPaused: boolean;
  isFinished: boolean;
}

export interface InPageWidgetOptions {
  onStartDownload?: (documentType: string) => void;
  onPauseDownload?: () => void;
  onResumeDownload?: () => void;
  onExportCsv?: () => void;
  onDownloadTxtReport?: () => void;
  onStartBatchRange?: (params: { from: string; to: string; documentType: string }) => void;
}

/**
 * Widget flotante inyectado en el portal SRI en Línea usando Shadow DOM
 * para aislamiento total de estilos contra el CSS de JSF / Mojarra.
 */
export class InPageWidget {
  private hostElement: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private isMinimized = false;
  private options: InPageWidgetOptions;
  private resumeCallback?: () => void;
  private dismissCallback?: () => void;

  constructor(options: InPageWidgetOptions = {}) {
    this.options = options;
  }

  public mount(target: HTMLElement = document.body): void {
    const existing = document.getElementById('kattxo-sri-widget-host');
    if (existing) {
      this.hostElement = existing;
      this.shadow = existing.shadowRoot;
      return;
    }

    this.hostElement = document.createElement('div');
    this.hostElement.id = 'kattxo-sri-widget-host';
    this.shadow = this.hostElement.attachShadow({ mode: 'open' });
    this.render();
    target.appendChild(this.hostElement);
    this.attachEvents();
  }

  private render(): void {
    if (!this.shadow) return;
    const defaultRange = getDefaultDateRange();

    this.shadow.innerHTML = `
      <style>
        :host {
          all: initial;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          z-index: 9999999;
          position: fixed;
          bottom: 20px;
          right: 20px;
          color: #1e293b;
          font-size: 13px;
        }

        .kattxo-widget-container {
          width: 360px;
          background: #f8f9ff;
          border-radius: 12px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          border: 1px solid #747687;
          overflow: hidden;
          transition: all 0.2s ease;
        }

        .kattxo-widget-header {
          background: #0c4597;
          color: #f8fafc;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          user-select: none;
        }

        .kattxo-header-title {
          font-weight: 700;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .kattxo-header-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          font-size: 14px;
          padding: 2px 6px;
          border-radius: 4px;
          transition: color 0.15s;
        }
        .kattxo-header-btn:hover {
          color: #ffffff;
          background: #1e293b;
        }

        .kattxo-toggle-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          font-size: 16px;
          padding: 2px 6px;
          border-radius: 4px;
          transition: color 0.15s;
        }
        .kattxo-toggle-btn:hover {
          color: #ffffff;
          background: #1e293b;
        }

        .kattxo-widget-body {
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .kattxo-taxpayer-badge {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 11px;
          color: #334155;
          line-height: 1.3;
        }
        .kattxo-taxpayer-ruc {
          font-weight: 700;
          color: #0f172a;
        }

        .kattxo-resume-banner {
          background: #fef3c7;
          border: 1px solid #fde68a;
          border-radius: 8px;
          padding: 8px 10px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          color: #92400e;
          font-size: 11.5px;
        }
        .kattxo-resume-info {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
        }
        .kattxo-resume-actions {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .kattxo-btn-resume-action {
          background: #d97706;
          color: #ffffff;
          border: none;
          border-radius: 4px;
          padding: 3px 8px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
        }
        .kattxo-btn-resume-action:hover {
          background: #b45309;
        }
        .kattxo-btn-dismiss-action {
          background: transparent;
          border: none;
          color: #92400e;
          cursor: pointer;
          font-size: 12px;
          padding: 2px 4px;
        }

        .kattxo-format-group {
          display: flex;
          justify-content: space-between;
          gap: 6px;
          padding: 6px 4px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
        }
        .kattxo-radio-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11.5px;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
        }
        .kattxo-radio {
          cursor: pointer;
          accent-color: #0c4597;
        }

        .kattxo-status-card {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 10px 12px;
        }
        .kattxo-status-icon {
          width: 38px;
          height: 38px;
          border-radius: 8px;
          background: #0c4597;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .kattxo-status-icon svg {
          width: 22px;
          height: 22px;
        }
        .kattxo-status-info {
          display: flex;
          flex-direction: column;
        }
        .kattxo-status-label-small {
          font-size: 11px;
          color: #6b7280;
          font-weight: 500;
        }
        .kattxo-status-counts {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }
        .kattxo-stat-downloaded {
          font-size: 18px;
          font-weight: 700;
          color: #111827;
          line-height: 1.2;
        }
        .kattxo-stat-total {
          font-size: 11.5px;
          color: #6b7280;
        }
        .kattxo-label {
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
        }
        .kattxo-select {
          padding: 6px 8px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          font-size: 12px;
          background: #ffffff;
          outline: none;
        }

        .kattxo-progress-section {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 8px 10px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .kattxo-progress-header {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          font-weight: 600;
          color: #475569;
        }
        .kattxo-progress-track {
          height: 6px;
          background: #e2e8f0;
          border-radius: 999px;
          overflow: hidden;
        }
        .kattxo-progress-fill {
          height: 100%;
          width: 0%;
          background: #4f46e5;
          border-radius: 999px;
          transition: width 0.2s ease;
        }

        .kattxo-start-btn {
          background: #4f46e5;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: background 0.15s;
        }
        .kattxo-start-btn:hover {
          background: #4338ca;
        }

        .kattxo-btn-row {
          display: flex;
          gap: 6px;
        }
        .kattxo-action-btn {
          flex: 1;
          padding: 5px 8px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          color: #475569;
        }
        .kattxo-action-btn:hover {
          background: #f1f5f9;
        }
      </style>

      <div class="kattxo-widget-container">
        <div class="kattxo-widget-header">
          <span class="kattxo-header-title">⚡ Kattxo | XML Manager</span>
          <div style="display: flex; gap: 4px; align-items: center;">
            <button type="button" class="kattxo-options-btn kattxo-header-btn" title="Historial y Configuración">⚙️</button>
            <button type="button" class="kattxo-toggle-btn kattxo-header-btn" title="Minimizar / Expandir">_</button>
          </div>
        </div>

        <div class="kattxo-widget-body">
          <div class="kattxo-taxpayer-badge">
            <span class="kattxo-taxpayer-ruc">RUC: No detectado</span>
            <div class="kattxo-taxpayer-name">Navegando en portal SRI</div>
          </div>

          <div class="kattxo-resume-banner" style="display: none;">
            <div class="kattxo-resume-info">
              <span>⚡</span>
              <span>Descarga previa pendiente (<strong class="kattxo-resume-count">0</strong> comprobantes)</span>
            </div>
            <div class="kattxo-resume-actions">
              <button type="button" class="kattxo-btn-resume-action">Reanudar ahora</button>
              <button type="button" class="kattxo-btn-dismiss-action" title="Descartar">✕</button>
            </div>
          </div>

          <div class="kattxo-form-group">
            <label class="kattxo-label">Tipo de Comprobante</label>
            <select class="kattxo-select kattxo-doc-type-select">
              <option value="ALL">Todos los Comprobantes</option>
              <option value="01">Facturas (01)</option>
              <option value="07">Retenciones (07)</option>
              <option value="04">Notas de Crédito (04)</option>
              <option value="03">Liquidaciones de Compra (03)</option>
              <option value="05">Notas de Débito (05)</option>
              <option value="06">Guías de Remisión (06)</option>
            </select>
          </div>

          <div style="display: flex; gap: 8px;">
            <div class="kattxo-form-group" style="flex: 1;">
              <label class="kattxo-label">Desde</label>
              <input type="date" class="kattxo-select kattxo-date-from" value="${defaultRange.from}" />
            </div>
            <div class="kattxo-form-group" style="flex: 1;">
              <label class="kattxo-label">Hasta</label>
              <input type="date" class="kattxo-select kattxo-date-to" value="${defaultRange.to}" />
            </div>
          </div>

          <div class="kattxo-format-group" role="radiogroup" aria-label="Formato de descarga">
            <label class="kattxo-radio-item">
              <input type="radio" class="kattxo-radio" name="kattxo-format" value="XML" checked>
              <span>Extractos XML</span>
            </label>
            <label class="kattxo-radio-item">
              <input type="radio" class="kattxo-radio" name="kattxo-format" value="PDF">
              <span>Archivos PDF</span>
            </label>
            <label class="kattxo-radio-item">
              <input type="radio" class="kattxo-radio" name="kattxo-format" value="TXT">
              <span>Reportes TXT</span>
            </label>
          </div>

          <div class="kattxo-status-card">
            <div class="kattxo-status-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            </div>
            <div class="kattxo-status-info">
              <p class="kattxo-status-label-small">Comprobantes procesados</p>
              <div class="kattxo-status-counts">
                <span class="kattxo-stat-downloaded">0</span>
                <span class="kattxo-stat-total">/ 0 archivos</span>
              </div>
            </div>
          </div>

          <button type="button" class="kattxo-start-btn kattxo-batch-range-btn" style="background: #0284c7;">
            <span>📅 Consultar y Descargar Rango</span>
          </button>

          <div class="kattxo-progress-section">
            <div class="kattxo-progress-header">
              <span class="kattxo-status-label">Listo</span>
              <span class="kattxo-progress-text">0 / 0</span>
            </div>
            <div class="kattxo-progress-track">
              <div class="kattxo-progress-fill"></div>
            </div>
          </div>

          <button type="button" class="kattxo-start-btn">
            <span>⚡ Iniciar Descarga Automática</span>
          </button>

          <div class="kattxo-btn-row">
            <button type="button" class="kattxo-action-btn kattxo-pause-btn">Pausar</button>
            <button type="button" class="kattxo-action-btn kattxo-resume-btn">Reanudar</button>
          </div>

          <div class="kattxo-btn-row">
            <button type="button" class="kattxo-action-btn kattxo-export-csv-btn" title="Exportar comprobantes detectados a CSV para Excel">📊 Exportar CSV</button>
            <button type="button" class="kattxo-action-btn kattxo-txt-report-btn" title="Descargar reporte TXT generado por el SRI">📄 Reporte TXT SRI</button>
          </div>
        </div>
      </div>
    `;
  }

  private attachEvents(): void {
    if (!this.shadow) return;

    const toggleBtn = this.shadow.querySelector('.kattxo-toggle-btn');
    const optionsBtn = this.shadow.querySelector('.kattxo-options-btn');
    const bodyEl = this.shadow.querySelector<HTMLElement>('.kattxo-widget-body');

    optionsBtn?.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      }
    });

    toggleBtn?.addEventListener('click', () => {
      this.isMinimized = !this.isMinimized;
      if (bodyEl) {
        bodyEl.style.display = this.isMinimized ? 'none' : 'flex';
      }
      if (toggleBtn) {
        toggleBtn.textContent = this.isMinimized ? '▢' : '_';
      }
    });

    const startBtn = this.shadow.querySelector('.kattxo-start-btn');
    const select = this.shadow.querySelector<HTMLSelectElement>('.kattxo-doc-type-select');

    startBtn?.addEventListener('click', () => {
      const docType = select ? select.value : 'ALL';
      if (this.options.onStartDownload) {
        this.options.onStartDownload(docType);
      }
    });

    const batchBtn = this.shadow.querySelector('.kattxo-batch-range-btn');
    const fromInput = this.shadow.querySelector<HTMLInputElement>('.kattxo-date-from');
    const toInput = this.shadow.querySelector<HTMLInputElement>('.kattxo-date-to');

    batchBtn?.addEventListener('click', () => {
      const from = fromInput?.value || '';
      const to = toInput?.value || '';
      const docType = select ? select.value : 'ALL';
      if (this.options.onStartBatchRange) {
        this.options.onStartBatchRange({ from, to, documentType: docType });
      }
    });

    const pauseBtn = this.shadow.querySelector('.kattxo-pause-btn');
    pauseBtn?.addEventListener('click', () => {
      if (this.options.onPauseDownload) {
        this.options.onPauseDownload();
      }
    });

    const resumeBtn = this.shadow.querySelector('.kattxo-resume-btn');
    resumeBtn?.addEventListener('click', () => {
      if (this.options.onResumeDownload) {
        this.options.onResumeDownload();
      }
    });

    const exportCsvBtn = this.shadow.querySelector('.kattxo-export-csv-btn');
    exportCsvBtn?.addEventListener('click', () => {
      if (this.options.onExportCsv) {
        this.options.onExportCsv();
      }
    });

    const txtReportBtn = this.shadow.querySelector('.kattxo-txt-report-btn');
    txtReportBtn?.addEventListener('click', () => {
      if (this.options.onDownloadTxtReport) {
        this.options.onDownloadTxtReport();
      }
    });

    const bannerResumeBtn = this.shadow.querySelector('.kattxo-btn-resume-action');
    bannerResumeBtn?.addEventListener('click', () => {
      if (this.resumeCallback) {
        this.resumeCallback();
      }
    });

    const bannerDismissBtn = this.shadow.querySelector('.kattxo-btn-dismiss-action');
    bannerDismissBtn?.addEventListener('click', () => {
      this.hideResumeBanner();
      if (this.dismissCallback) {
        this.dismissCallback();
      }
    });
  }

  public hideResumeBanner(): void {
    if (!this.shadow) return;
    const banner = this.shadow.querySelector<HTMLElement>('.kattxo-resume-banner');
    if (banner) banner.style.display = 'none';
  }

  public showResumeBanner(pendingCount: number, onResumeClick: () => void, onDismissClick?: () => void): void {
    if (!this.shadow) return;
    this.resumeCallback = onResumeClick;
    this.dismissCallback = onDismissClick;

    const banner = this.shadow.querySelector<HTMLElement>('.kattxo-resume-banner');
    const countEl = this.shadow.querySelector('.kattxo-resume-count');

    if (countEl) countEl.textContent = pendingCount.toString();
    if (banner) banner.style.display = 'flex';
  }

  public getSelectedFormat(): 'XML' | 'PDF' | 'TXT' {
    if (!this.shadow) return 'XML';
    const radios = Array.from(this.shadow.querySelectorAll<HTMLInputElement>('input[name="kattxo-format"]'));
    const checked = radios.find((r) => r.checked);
    const val = checked?.value;
    if (val === 'PDF' || val === 'TXT') return val;
    return 'XML';
  }

  public setTaxpayerProfile(profile: TaxpayerProfile): void {
    if (!this.shadow) return;
    const rucEl = this.shadow.querySelector('.kattxo-taxpayer-ruc');
    const nameEl = this.shadow.querySelector('.kattxo-taxpayer-name');

    if (rucEl) {
      rucEl.textContent = `RUC: ${profile.ruc}`;
    }
    if (nameEl) {
      nameEl.textContent = profile.razonSocial || 'Contribuyente autenticado';
    }
  }

  public setStatusText(text: string): void {
    if (!this.shadow) return;
    const statusLabel = this.shadow.querySelector('.kattxo-status-label');
    if (statusLabel) {
      statusLabel.textContent = text;
    }
  }

  public updateProgress(data: InPageProgressData): void {
    if (!this.shadow) return;
    const statusLabel = this.shadow.querySelector('.kattxo-status-label');
    const progressText = this.shadow.querySelector('.kattxo-progress-text');
    const progressFill = this.shadow.querySelector<HTMLElement>('.kattxo-progress-fill');

    if (progressText) {
      progressText.textContent = `${data.completed} / ${data.total}`;
    }

    if (progressFill) {
      const pct = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
      progressFill.style.width = `${pct}%`;
    }

    if (statusLabel) {
      if (data.isFinished) {
        statusLabel.textContent = `Completado (${data.completed} OK, ${data.failed} fallos)`;
      } else if (data.isPaused) {
        statusLabel.textContent = 'En pausa';
      } else {
        statusLabel.textContent = `Descargando... (${data.completed}/${data.total})`;
      }
    }
  }
}
