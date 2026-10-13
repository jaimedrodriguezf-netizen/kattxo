import { describe, it, expect, beforeEach } from 'vitest';
import { calculateProgressPercentage, formatProgressRatio } from '../src/popup/controller';
import { QueueStats } from '../src/domain/types';

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
});
