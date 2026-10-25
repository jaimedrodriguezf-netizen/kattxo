import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DownloadQueueManager } from '../src/background/queue';
import { SriVoucher, RetentionVoucher } from '../src/domain/types';

describe('DownloadQueueManager', () => {
  const sampleVouchers: RetentionVoucher[] = [
    {
      claveAcceso: '1111111111111111111111111111111111111111111111111',
      tipoComprobante: '07',
      rucEmisor: '1790016919001',
      numeroComprobante: '001-001-000000001',
      fechaEmision: '01/01/2024',
      razonSocialEmisor: 'EMISOR 1',
    },
    {
      claveAcceso: '2222222222222222222222222222222222222222222222222',
      tipoComprobante: '07',
      rucEmisor: '1790016919002',
      numeroComprobante: '001-001-000000002',
      fechaEmision: '02/01/2024',
      razonSocialEmisor: 'EMISOR 2',
    },
  ];

  let queue: DownloadQueueManager;

  beforeEach(() => {
    vi.restoreAllMocks();
    queue = new DownloadQueueManager({
      delayBetweenRequestsMs: 10, // Rápido para tests
      maxRetries: 2,
      concurrency: 1,
      downloadSubdirectory: 'Kattxo/Test',
    });
  });

  it('enqueues vouchers and initializes stats correctly', () => {
    queue.enqueue(sampleVouchers);
    const state = queue.getState();
    expect(state.items).toHaveLength(2);
    expect(state.stats.total).toBe(2);
    expect(state.stats.pending).toBe(2);
    expect(state.stats.completed).toBe(0);
    expect(state.stats.failed).toBe(0);
  });

  it('processes all items successfully when worker function succeeds', async () => {
    queue.enqueue(sampleVouchers);

    const mockProcess = vi.fn().mockResolvedValue(true);
    queue.setProcessItemFn(mockProcess);

    await queue.start();

    const state = queue.getState();
    expect(state.stats.completed).toBe(2);
    expect(state.stats.failed).toBe(0);
    expect(state.stats.pending).toBe(0);
    expect(mockProcess).toHaveBeenCalledTimes(2);
  });

  it('retries up to maxRetries on failure and marks as failed if retries exhausted', async () => {
    queue.enqueue([sampleVouchers[0]]);

    const mockProcess = vi.fn().mockRejectedValue(new Error('Network error'));
    queue.setProcessItemFn(mockProcess);

    await queue.start();

    const state = queue.getState();
    expect(state.stats.completed).toBe(0);
    expect(state.stats.failed).toBe(1);
    expect(state.items[0].status).toBe('failed');
    expect(state.items[0].error).toContain('Network error');
    // maxRetries = 2, so 1 initial attempt + 2 retries = 3 attempts total
    expect(mockProcess).toHaveBeenCalledTimes(3);
  });

  it('allows pausing and resuming the queue', async () => {
    queue.enqueue(sampleVouchers);

    let processedCount = 0;
    queue.setProcessItemFn(async () => {
      processedCount++;
      if (processedCount === 1) {
        queue.pause();
      }
    });

    await queue.start();

    let state = queue.getState();
    expect(state.stats.completed).toBe(1);
    expect(state.stats.isPaused).toBe(true);

    // Resumir
    queue.resume();
    await queue.start();

    state = queue.getState();
    expect(state.stats.completed).toBe(2);
    expect(state.stats.isPaused).toBe(false);
  });

  it('enqueues vouchers with format option (xml and pdf) and routes hierarchically', () => {
    queue.enqueue([sampleVouchers[0]], { format: 'xml' });
    queue.enqueue([sampleVouchers[0]], { format: 'pdf' });

    const state = queue.getState();
    expect(state.items).toHaveLength(2);
    expect(state.items[0].format).toBe('xml');
    expect(state.items[1].format).toBe('pdf');
  });

  it('clears queue properly', () => {
    queue.enqueue(sampleVouchers);
    expect(queue.getState().items).toHaveLength(2);

    queue.clear();
    expect(queue.getState().items).toHaveLength(0);
    expect(queue.getState().stats.total).toBe(0);
  });
});
