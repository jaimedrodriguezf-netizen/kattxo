import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  formatBatchNotification,
  notifyBatchCompleted,
} from '../src/background/notifications';

describe('Desktop Notifications for SRI Batches', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('formatBatchNotification', () => {
    it('formats message when all vouchers succeed', () => {
      const res = formatBatchNotification({ total: 10, completed: 10, failed: 0 });
      expect(res.title).toContain('Kattxo SRI');
      expect(res.message).toContain('10 comprobantes descargados con éxito');
    });

    it('formats message when some vouchers fail', () => {
      const res = formatBatchNotification({ total: 10, completed: 8, failed: 2 });
      expect(res.title).toContain('Kattxo SRI');
      expect(res.message).toContain('8 completados');
      expect(res.message).toContain('2 con error');
    });
  });

  describe('notifyBatchCompleted', () => {
    it('calls chrome.notifications.create with proper options', async () => {
      let createdOptions: chrome.notifications.NotificationOptions | null = null;
      let notificationIdUsed = '';

      // Mock chrome.notifications
      const mockNotifications = {
        create: vi.fn().mockImplementation((id: string, opts: any, callback?: any) => {
          notificationIdUsed = id;
          createdOptions = opts;
          if (callback) callback(id);
          return Promise.resolve(id);
        }),
      };

      const globalWithChrome = globalThis as unknown as { chrome: { notifications: typeof mockNotifications } };
      globalWithChrome.chrome = {
        notifications: mockNotifications,
      };

      const id = await notifyBatchCompleted({ total: 5, completed: 5, failed: 0 });
      expect(id).toBeDefined();
      expect(mockNotifications.create).toHaveBeenCalled();
      expect(createdOptions).not.toBeNull();
      expect((createdOptions as any).title).toContain('Kattxo SRI');
      expect((createdOptions as any).type).toBe('basic');
    });
  });
});
