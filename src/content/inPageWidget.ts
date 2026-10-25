import { TaxpayerProfile } from '../domain/types';

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
          width: 320px;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
          overflow: hidden;
          transition: all 0.2s ease;
        }

        .kattxo-widget-header {
          background: #0f172a;
          color: #f8fafc;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          user-select: none;
        }

        .kattxo-header-title {
          font-weight: 700;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 6px;
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

        .kattxo-form-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
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
          <span class="kattxo-header-title">⚡ Kattxo SRI Manager</span>
          <button type="button" class="kattxo-toggle-btn" title="Minimizar / Expandir">_</button>
        </div>

        <div class="kattxo-widget-body">
          <div class="kattxo-taxpayer-badge">
            <span class="kattxo-taxpayer-ruc">RUC: No detectado</span>
            <div class="kattxo-taxpayer-name">Navegando en portal SRI</div>
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
        </div>
      </div>
    `;
  }

  private attachEvents(): void {
    if (!this.shadow) return;

    const toggleBtn = this.shadow.querySelector('.kattxo-toggle-btn');
    const bodyEl = this.shadow.querySelector<HTMLElement>('.kattxo-widget-body');

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
