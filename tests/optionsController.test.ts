import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OptionsController } from '../src/options/controller';
import { HistoryManager, DownloadSessionRecord } from '../src/domain/historyManager';

describe('OptionsController', () => {
  let mockHistoryManager: HistoryManager;

  beforeEach(() => {
    document.body.innerHTML = `
      <nav class="nav-tabs">
        <button class="tab-btn active" data-tab="tab-history">Historial</button>
        <button class="tab-btn" data-tab="tab-settings">Config</button>
      </nav>
      <section id="tab-history" class="tab-content active">
        <table>
          <tbody id="history-tbody"></tbody>
        </table>
        <div id="history-empty" style="display: none;"></div>
        <button id="btn-clear-history"></button>
      </section>
      <section id="tab-settings" class="tab-content">
        <form id="settings-form">
          <input id="setting-subdir" value="Kattxo" />
          <input id="setting-throttle" value="1200" />
          <input type="checkbox" id="setting-download-pdf" />
          <button type="submit"></button>
        </form>
      </section>
    `;

    mockHistoryManager = {
      getHistory: vi.fn().mockResolvedValue([]),
      getPreferences: vi.fn().mockResolvedValue({
        downloadSubdirectory: 'Kattxo',
        throttlingDelayMs: 1200,
        downloadPdfRide: false,
      }),
      savePreferences: vi.fn().mockResolvedValue({}),
      clearHistory: vi.fn().mockResolvedValue({}),
      saveSessionRecord: vi.fn().mockResolvedValue({}),
      getPendingVouchersForSession: vi.fn().mockResolvedValue([]),
    } as unknown as HistoryManager;
  });

  it('switches tabs on tab button click', () => {
    const controller = new OptionsController(mockHistoryManager);
    controller.setupTabs();

    const buttons = document.querySelectorAll<HTMLButtonElement>('.tab-btn');
    buttons[1].click();

    expect(buttons[0].classList.contains('active')).toBe(false);
    expect(buttons[1].classList.contains('active')).toBe(true);

    const historyTab = document.getElementById('tab-history')!;
    const settingsTab = document.getElementById('tab-settings')!;
    expect(historyTab.classList.contains('active')).toBe(false);
    expect(settingsTab.classList.contains('active')).toBe(true);
  });

  it('renders history table with records and resume button when pending vouchers exist', async () => {
    const sampleRecord: DownloadSessionRecord = {
      id: 'session-123',
      timestamp: Date.now(),
      taxpayerRuc: '1790011223001',
      taxpayerName: 'KATTXO S.A.',
      documentType: '01',
      totalVouchers: 5,
      completedVouchers: 3,
      failedVouchers: 2,
      status: 'partial',
      pendingVouchers: [
        {
          claveAcceso: '1234567890123456789012345678901234567890123456789',
          rucEmisor: '1790011223001',
          razonSocialEmisor: 'EMISOR',
          numeroComprobante: '001-001-000000001',
          fechaEmision: '01/01/2024',
          tipoComprobante: '01',
        },
      ],
    };

    (mockHistoryManager.getHistory as any).mockResolvedValue([sampleRecord]);

    const controller = new OptionsController(mockHistoryManager);
    await controller.renderHistory();

    const tbody = document.getElementById('history-tbody')!;
    expect(tbody.children.length).toBe(1);
    expect(tbody.innerHTML).toContain('1790011223001');
    expect(tbody.innerHTML).toContain('3</strong> / 5');
    expect(tbody.innerHTML).toContain('Reanudar');
  });

  it('shows empty state when no history exists', async () => {
    (mockHistoryManager.getHistory as any).mockResolvedValue([]);

    const controller = new OptionsController(mockHistoryManager);
    await controller.renderHistory();

    const empty = document.getElementById('history-empty')!;
    expect(empty.style.display).toBe('block');
  });

  it('sets up import tab and parses dropped TXT report into preview table', () => {
    document.body.innerHTML += `
      <section id="tab-import" class="tab-content">
        <div id="txt-drop-zone">
          <input type="file" id="input-txt-file" />
        </div>
        <div id="import-preview-container" style="display: none;">
          <h3 id="import-summary-title"></h3>
          <table>
            <tbody id="import-preview-tbody"></tbody>
          </table>
          <select id="import-format-select"><option value="xml">XML</option></select>
          <button id="btn-start-import-download"></button>
        </div>
      </section>
    `;

    const controller = new OptionsController(mockHistoryManager);
    controller.setupImportTab();

    const sampleKey = '1405202401019000000000120010010000001231234567818';
    const sampleTxt = `0190000000001\tEMPRESA DEMO\tFactura\t001-001-000000123\t${sampleKey}\t14/05/2024\t100.00\tAUTORIZADO`;

    controller.handleTxtContent(sampleTxt, 'reporte_sri.txt');

    const previewContainer = document.getElementById('import-preview-container')!;
    const title = document.getElementById('import-summary-title')!;
    const tbody = document.getElementById('import-preview-tbody')!;

    expect(previewContainer.style.display).not.toBe('none');
    expect(title.textContent).toContain('1 comprobante');
    expect(tbody.innerHTML).toContain(sampleKey);
    expect(tbody.innerHTML).toContain('EMPRESA DEMO');
    expect(controller.getParsedImportVouchers()).toHaveLength(1);
  });

  it('loads and saves custom filename pattern in settings', async () => {
    document.getElementById('settings-form')!.innerHTML += `
      <input id="setting-filename-pattern" value="{tipo}_{clave}" />
      <span id="pattern-preview-text"></span>
      <button type="button" class="btn-pattern-preset" data-preset="{ruc}_{numero}">preset</button>
    `;

    (mockHistoryManager.getPreferences as any).mockResolvedValue({
      downloadSubdirectory: 'Kattxo',
      throttlingDelayMs: 1200,
      downloadPdfRide: false,
      filenamePattern: '{ruc}_{numero}',
    });

    const controller = new OptionsController(mockHistoryManager);
    controller.setupSettingsForm();
    await controller.loadPreferences();

    const patternInput = document.getElementById('setting-filename-pattern') as HTMLInputElement;
    expect(patternInput.value).toBe('{ruc}_{numero}');

    // Preset button click
    const presetBtn = document.querySelector<HTMLButtonElement>('.btn-pattern-preset')!;
    presetBtn.click();
    expect(patternInput.value).toBe('{ruc}_{numero}');
  });
});
