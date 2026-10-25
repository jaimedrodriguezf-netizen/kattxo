import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  HistoryManager,
  DownloadSessionRecord,
  UserPreferences,
  AutoResumeState,
  DEFAULT_USER_PREFERENCES,
} from '../src/domain/historyManager';
import { SriVoucher } from '../src/domain/types';

describe('HistoryManager & User Preferences', () => {
  let mockStorageData: Record<string, unknown> = {};

  const mockStorage = {
    get: vi.fn().mockImplementation((keys: string | string[]) => {
      const result: Record<string, unknown> = {};
      const keyList = Array.isArray(keys) ? keys : [keys];
      for (const k of keyList) {
        if (mockStorageData[k] !== undefined) {
          result[k] = mockStorageData[k];
        }
      }
      return Promise.resolve(result);
    }),
    set: vi.fn().mockImplementation((items: Record<string, unknown>) => {
      Object.assign(mockStorageData, items);
      return Promise.resolve();
    }),
    remove: vi.fn().mockImplementation((keys: string | string[]) => {
      const keyList = Array.isArray(keys) ? keys : [keys];
      for (const k of keyList) {
        delete mockStorageData[k];
      }
      return Promise.resolve();
    }),
  };

  const sampleVoucher: SriVoucher = {
    claveAcceso: '0101202401179000000000120010010000000011234567811',
    rucEmisor: '1790000000001',
    razonSocialEmisor: 'EMPRESA 1',
    numeroComprobante: '001-001-000000001',
    fechaEmision: '01/01/2024',
    tipoComprobante: '01',
  };

  beforeEach(() => {
    mockStorageData = {};
    vi.clearAllMocks();
  });

  describe('History Sessions Management', () => {
    it('saves a session record and retrieves it sorted newest first', async () => {
      const manager = new HistoryManager(mockStorage);

      const record1: DownloadSessionRecord = {
        id: 'session-1',
        timestamp: 1000,
        taxpayerRuc: '1790000000001',
        documentType: '01',
        totalVouchers: 10,
        completedVouchers: 10,
        failedVouchers: 0,
        status: 'completed',
        pendingVouchers: [],
      };

      const record2: DownloadSessionRecord = {
        id: 'session-2',
        timestamp: 2000,
        taxpayerRuc: '1790000000001',
        documentType: '07',
        totalVouchers: 5,
        completedVouchers: 3,
        failedVouchers: 2,
        status: 'partial',
        pendingVouchers: [sampleVoucher],
      };

      await manager.saveSessionRecord(record1);
      await manager.saveSessionRecord(record2);

      const history = await manager.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].id).toBe('session-2'); // newest first
      expect(history[1].id).toBe('session-1');
    });

    it('retrieves pending vouchers from an incomplete session to resume', async () => {
      const manager = new HistoryManager(mockStorage);

      const record: DownloadSessionRecord = {
        id: 'session-interrupted',
        timestamp: 1000,
        taxpayerRuc: '1790000000001',
        documentType: '01',
        totalVouchers: 2,
        completedVouchers: 1,
        failedVouchers: 1,
        status: 'interrupted',
        pendingVouchers: [sampleVoucher],
      };

      await manager.saveSessionRecord(record);

      const pending = await manager.getPendingVouchersForSession('session-interrupted');
      expect(pending).toHaveLength(1);
      expect(pending[0].claveAcceso).toBe(sampleVoucher.claveAcceso);
    });

    it('clears all session records', async () => {
      const manager = new HistoryManager(mockStorage);
      await manager.saveSessionRecord({
        id: 'session-1',
        timestamp: 1000,
        taxpayerRuc: '1790000000001',
        documentType: '01',
        totalVouchers: 1,
        completedVouchers: 1,
        failedVouchers: 0,
        status: 'completed',
        pendingVouchers: [],
      });

      await manager.clearHistory();
      const history = await manager.getHistory();
      expect(history).toEqual([]);
    });
  });

  describe('User Preferences Management', () => {
    it('returns default preferences when none are stored', async () => {
      const manager = new HistoryManager(mockStorage);
      const prefs = await manager.getPreferences();
      expect(prefs).toEqual(DEFAULT_USER_PREFERENCES);
    });

    it('updates and persists user preferences', async () => {
      const manager = new HistoryManager(mockStorage);
      await manager.savePreferences({
        downloadSubdirectory: 'Facturas_SRI_2024',
        throttlingDelayMs: 2000,
        downloadPdfRide: true,
      });

      const updated = await manager.getPreferences();
      expect(updated.downloadSubdirectory).toBe('Facturas_SRI_2024');
      expect(updated.throttlingDelayMs).toBe(2000);
      expect(updated.downloadPdfRide).toBe(true);
    });
  });

  describe('Auto-Resume State Management', () => {
    it('saves and retrieves auto-resume state', async () => {
      const manager = new HistoryManager(mockStorage);
      const state: AutoResumeState = {
        id: 'auto-123',
        timestamp: Date.now(),
        taxpayerRuc: '1790011223001',
        pendingVouchers: [sampleVoucher],
        totalOriginal: 10,
        completedSoFar: 4,
      };

      await manager.saveAutoResumeState(state);
      const retrieved = await manager.getAutoResumeState();

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe('auto-123');
      expect(retrieved?.pendingVouchers).toHaveLength(1);
      expect(retrieved?.completedSoFar).toBe(4);
    });

    it('clears auto-resume state', async () => {
      const manager = new HistoryManager(mockStorage);
      await manager.saveAutoResumeState({
        id: 'auto-123',
        timestamp: Date.now(),
        taxpayerRuc: '1790011223001',
        pendingVouchers: [sampleVoucher],
        totalOriginal: 10,
        completedSoFar: 4,
      });

      await manager.clearAutoResumeState();
      const retrieved = await manager.getAutoResumeState();
      expect(retrieved).toBeNull();
    });

    it('returns null if no auto-resume state is stored', async () => {
      const manager = new HistoryManager(mockStorage);
      const retrieved = await manager.getAutoResumeState();
      expect(retrieved).toBeNull();
    });
  });
});
