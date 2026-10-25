import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SriContentScript } from '../src/content/index';
import { HistoryManager } from '../src/domain/historyManager';
import { SriVoucher } from '../src/domain/types';

describe('Circuit Breaker & Auto-Resume on SRI Failures', () => {
  let mockStorageData: Record<string, unknown> = {};

  const sampleVouchers: SriVoucher[] = [
    {
      claveAcceso: '1111111111111111111111111111111111111111111111111',
      tipoComprobante: '01',
      rucEmisor: '1790016919001',
      numeroComprobante: '001-001-000000001',
      fechaEmision: '01/01/2024',
      razonSocialEmisor: 'EMPRESA 1',
    },
    {
      claveAcceso: '2222222222222222222222222222222222222222222222222',
      tipoComprobante: '01',
      rucEmisor: '1790016919001',
      numeroComprobante: '001-001-000000002',
      fechaEmision: '01/01/2024',
      razonSocialEmisor: 'EMPRESA 1',
    },
    {
      claveAcceso: '3333333333333333333333333333333333333333333333333',
      tipoComprobante: '01',
      rucEmisor: '1790016919001',
      numeroComprobante: '001-001-000000003',
      fechaEmision: '01/01/2024',
      razonSocialEmisor: 'EMPRESA 1',
    },
    {
      claveAcceso: '4444444444444444444444444444444444444444444444444',
      tipoComprobante: '01',
      rucEmisor: '1790016919001',
      numeroComprobante: '001-001-000000004',
      fechaEmision: '01/01/2024',
      razonSocialEmisor: 'EMPRESA 1',
    },
  ];

  beforeEach(() => {
    mockStorageData = {};
    vi.restoreAllMocks();

    const mockStorage = {
      get: vi.fn().mockImplementation((keys) => {
        const res: Record<string, unknown> = {};
        const list = Array.isArray(keys) ? keys : [keys];
        list.forEach((k) => {
          if (mockStorageData[k] !== undefined) res[k] = mockStorageData[k];
        });
        return Promise.resolve(res);
      }),
      set: vi.fn().mockImplementation((items) => {
        Object.assign(mockStorageData, items);
        return Promise.resolve();
      }),
      remove: vi.fn().mockImplementation((keys) => {
        const list = Array.isArray(keys) ? keys : [keys];
        list.forEach((k) => delete mockStorageData[k]);
        return Promise.resolve();
      }),
    };

    (globalThis as any).chrome = {
      storage: { local: mockStorage },
      runtime: { sendMessage: vi.fn() },
    };
  });

  it('triggers circuit breaker and saves auto-resume state after 3 consecutive failures', async () => {
    const script = new SriContentScript();
    script.init();

    // Mock triggerDownloadForVoucher to always fail
    (script as any).triggerDownloadForVoucher = vi.fn().mockReturnValue(false);

    await script.startBulkDownload(sampleVouchers);

    // Should stop at 3rd failure and not process 4th
    expect((script as any).triggerDownloadForVoucher).toHaveBeenCalledTimes(3);

    // Verify auto-resume state was saved
    const historyManager = new HistoryManager();
    const autoResume = await historyManager.getAutoResumeState();

    expect(autoResume).not.toBeNull();
    expect(autoResume?.pendingVouchers.length).toBeGreaterThan(0);
  });
});
