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
});
