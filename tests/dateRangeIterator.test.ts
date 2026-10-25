import { describe, it, expect } from 'vitest';
import {
  generateDateRangeSteps,
  getDefaultDateRange,
  parseIsoDate,
  SriDateStep,
} from '../src/domain/dateRangeIterator';

describe('Date Range Iterator for SRI', () => {
  describe('parseIsoDate', () => {
    it('parses valid YYYY-MM-DD string into components', () => {
      const parts = parseIsoDate('2024-08-15');
      expect(parts).toEqual({
        year: '2024',
        month: '8',
        day: '15',
        isoString: '2024-08-15',
        formattedLabel: '15/08/2024',
      });
    });

    it('handles single-digit days and months properly without extra leading zeros for select inputs', () => {
      const parts = parseIsoDate('2024-01-05');
      expect(parts).toEqual({
        year: '2024',
        month: '1',
        day: '5',
        isoString: '2024-01-05',
        formattedLabel: '05/01/2024',
      });
    });
  });

  describe('generateDateRangeSteps', () => {
    it('generates a single step when from and to are the same day', () => {
      const steps = generateDateRangeSteps('2024-05-10', '2024-05-10');
      expect(steps).toHaveLength(1);
      expect(steps[0].day).toBe('10');
      expect(steps[0].month).toBe('5');
      expect(steps[0].year).toBe('2024');
    });

    it('generates sequential daily steps across multiple days', () => {
      const steps = generateDateRangeSteps('2024-01-01', '2024-01-03');
      expect(steps).toHaveLength(3);
      expect(steps.map((s) => s.day)).toEqual(['1', '2', '3']);
      expect(steps[0].formattedLabel).toBe('01/01/2024');
      expect(steps[2].formattedLabel).toBe('03/01/2024');
    });

    it('handles transition between months correctly (e.g. Jan 31 to Feb 2)', () => {
      const steps = generateDateRangeSteps('2024-01-31', '2024-02-02');
      expect(steps).toHaveLength(3);
      expect(steps[0].formattedLabel).toBe('31/01/2024');
      expect(steps[0].month).toBe('1');
      expect(steps[1].formattedLabel).toBe('01/02/2024');
      expect(steps[1].month).toBe('2');
      expect(steps[2].formattedLabel).toBe('02/02/2024');
      expect(steps[2].month).toBe('2');
    });

    it('swaps inverted dates safely without crashing (from > to)', () => {
      const steps = generateDateRangeSteps('2024-03-05', '2024-03-01');
      expect(steps).toHaveLength(5);
      expect(steps[0].day).toBe('1');
      expect(steps[4].day).toBe('5');
    });

    it('returns empty array when invalid date string is provided', () => {
      const steps = generateDateRangeSteps('invalid', '2024-01-01');
      expect(steps).toEqual([]);
    });
  });

  describe('getDefaultDateRange', () => {
    it('returns first day of current month as "from" and today as "to"', () => {
      const range = getDefaultDateRange();
      expect(range.from).toMatch(/^\d{4}-\d{2}-01$/);
      expect(range.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      const fromDate = new Date(range.from);
      const toDate = new Date(range.to);
      expect(fromDate.getTime()).toBeLessThanOrEqual(toDate.getTime());
    });
  });
});
