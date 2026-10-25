import { describe, it, expect, beforeEach, vi } from 'vitest';
import { calculateProgressPercentage, formatProgressRatio, PopupController } from '../src/popup/controller';
import { QueueStats, SriVoucher } from '../src/domain/types';

describe('Popup Controller Helpers', () => {
  describe('calculateProgressPercentage', () => {
    it('returns 0 when total is 0', () => {
      const stats: QueueStats = {
        total: 0,
        pending: 0,
        downloading: 0,
        completed: 0,
        failed: 0,
        isPaused: false,
        isRunning: false,
      };
      expect(calculateProgressPercentage(stats)).toBe(0);
    });

    it('calculates completed + failed ratio correctly', () => {
      const stats: QueueStats = {
        total: 10,
        pending: 5,
        downloading: 1,
        completed: 3,
        failed: 1,
        isPaused: false,
        isRunning: true,
      };
      // (3 completed + 1 failed) / 10 = 40%
      expect(calculateProgressPercentage(stats)).toBe(40);
    });

    it('returns 100 when all are completed', () => {
      const stats: QueueStats = {
        total: 5,
        pending: 0,
        downloading: 0,
        completed: 5,
        failed: 0,
        isPaused: false,
        isRunning: false,
      };
      expect(calculateProgressPercentage(stats)).toBe(100);
    });
  });

  describe('formatProgressRatio', () => {
    it('formats processed vs total ratio', () => {
      const stats: QueueStats = {
        total: 15,
        pending: 5,
        downloading: 0,
        completed: 8,
        failed: 2,
        isPaused: false,
        isRunning: false,
      };
      expect(formatProgressRatio(stats)).toBe('10 / 15');
    });
  });

  describe('PopupController export & TXT actions', () => {
    it('creates and triggers download link when exportCsv is called with detected vouchers', () => {
      const controller = new PopupController();
      const sampleVoucher: SriVoucher = {
        claveAcceso: '0101202407019000000000120010010000000011234567813',
        rucEmisor: '0190000000001',
        razonSocialEmisor: 'EMPRESA EJEMPLO S.A.',
        numeroComprobante: '001-001-000000001',
        fechaEmision: '01/01/2024',
        tipoComprobante: '07',
      };

      // @ts-expect-error set private detected for test
      controller.detectedRetenciones = [sampleVoucher];

      let clickedDownload = false;
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const el = document.createElementNS('http://www.w3.org/1999/xhtml', tag) as HTMLElement;
        if (tag === 'a') {
          el.click = () => {
            clickedDownload = true;
          };
        }
        return el;
      });

      controller.exportCsv();
      expect(clickedDownload).toBe(true);
    });
  });
});
