import { SriVoucher } from './types';

export type BatchStatus = 'completed' | 'partial' | 'interrupted' | 'failed';

export interface DownloadSessionRecord {
  id: string;
  timestamp: number;
  taxpayerRuc: string;
  taxpayerName?: string;
  documentType: string;
  totalVouchers: number;
  completedVouchers: number;
  failedVouchers: number;
  status: BatchStatus;
  dateRangeLabel?: string;
  pendingVouchers: SriVoucher[];
}

export interface UserPreferences {
  downloadSubdirectory: string;
  throttlingDelayMs: number;
  downloadPdfRide: boolean;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  downloadSubdirectory: 'Kattxo',
  throttlingDelayMs: 1200,
  downloadPdfRide: false,
};

export interface StorageAreaLike {
  get(keys: string | string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
}

const STORAGE_KEY_HISTORY = 'kattxo_download_history';
const STORAGE_KEY_PREFS = 'kattxo_user_preferences';

export class HistoryManager {
  private storage: StorageAreaLike;

  constructor(storage?: StorageAreaLike) {
    if (storage) {
      this.storage = storage;
    } else if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      this.storage = chrome.storage.local as unknown as StorageAreaLike;
    } else {
      // Memory fallback
      const inMemoryData: Record<string, unknown> = {};
      this.storage = {
        get: async (keys) => {
          const res: Record<string, unknown> = {};
          const list = Array.isArray(keys) ? keys : [keys];
          list.forEach((k) => {
            if (inMemoryData[k] !== undefined) res[k] = inMemoryData[k];
          });
          return res;
        },
        set: async (items) => {
          Object.assign(inMemoryData, items);
        },
        remove: async (keys) => {
          const list = Array.isArray(keys) ? keys : [keys];
          list.forEach((k) => delete inMemoryData[k]);
        },
      };
    }
  }

  public async getHistory(): Promise<DownloadSessionRecord[]> {
    const data = await this.storage.get(STORAGE_KEY_HISTORY);
    const records = (data[STORAGE_KEY_HISTORY] as DownloadSessionRecord[]) || [];
    return records.sort((a, b) => b.timestamp - a.timestamp);
  }

  public async saveSessionRecord(record: DownloadSessionRecord): Promise<void> {
    const history = await this.getHistory();
    const existingIndex = history.findIndex((h) => h.id === record.id);

    if (existingIndex >= 0) {
      history[existingIndex] = record;
    } else {
      history.unshift(record);
    }

    // Limitar historial a los últimos 100 lotes
    const trimmed = history.slice(0, 100);
    await this.storage.set({ [STORAGE_KEY_HISTORY]: trimmed });
  }

  public async getPendingVouchersForSession(sessionId: string): Promise<SriVoucher[]> {
    const history = await this.getHistory();
    const found = history.find((h) => h.id === sessionId);
    return found ? found.pendingVouchers || [] : [];
  }

  public async clearHistory(): Promise<void> {
    await this.storage.remove(STORAGE_KEY_HISTORY);
  }

  public async getPreferences(): Promise<UserPreferences> {
    const data = await this.storage.get(STORAGE_KEY_PREFS);
    const stored = data[STORAGE_KEY_PREFS] as Partial<UserPreferences> | undefined;
    return { ...DEFAULT_USER_PREFERENCES, ...stored };
  }

  public async savePreferences(prefs: Partial<UserPreferences>): Promise<UserPreferences> {
    const current = await this.getPreferences();
    const updated = { ...current, ...prefs };
    await this.storage.set({ [STORAGE_KEY_PREFS]: updated });
    return updated;
  }
}
