import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BatchQueryRunner, BatchQueryConfig } from '../src/content/batchQueryRunner';
import { SriDateStep } from '../src/domain/dateRangeIterator';
import { SriVoucher } from '../src/domain/types';

describe('BatchQueryRunner (Continuous Date Query Orchestrator)', () => {
  const steps: SriDateStep[] = [
    { year: '2024', month: '1', day: '1', isoString: '2024-01-01', formattedLabel: '01/01/2024' },
    { year: '2024', month: '1', day: '2', isoString: '2024-01-02', formattedLabel: '02/01/2024' },
  ];

  const sampleVoucher1: SriVoucher = {
    claveAcceso: '0101202401179000000000120010010000000011234567811',
    rucEmisor: '1790000000001',
    razonSocialEmisor: 'EMPRESA 1',
    numeroComprobante: '001-001-000000001',
    fechaEmision: '01/01/2024',
    tipoComprobante: '01',
  };

  const sampleVoucher2: SriVoucher = {
    claveAcceso: '0201202401179000000000120010010000000021234567812',
    rucEmisor: '1790000000001',
    razonSocialEmisor: 'EMPRESA 1',
    numeroComprobante: '001-001-000000002',
    fechaEmision: '02/01/2024',
    tipoComprobante: '01',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('iterates through all date steps and accumulates vouchers', async () => {
    const executedSteps: string[] = [];
    const collected: SriVoucher[] = [];

    const mockExecutor = vi.fn().mockImplementation(async (step: SriDateStep) => {
      executedSteps.push(step.formattedLabel);
      if (step.day === '1') return [sampleVoucher1];
      if (step.day === '2') return [sampleVoucher2];
      return [];
    });

    const runner = new BatchQueryRunner({
      steps,
      documentType: '01',
      interStepDelayMs: 5,
      executeStepFn: mockExecutor,
      onVouchersFound: (v) => collected.push(...v),
    });

    const result = await runner.run();

    expect(executedSteps).toEqual(['01/01/2024', '02/01/2024']);
    expect(result.totalFound).toBe(2);
    expect(result.vouchers).toHaveLength(2);
    expect(collected).toHaveLength(2);
    expect(result.status).toBe('completed');
  });

  it('deduplicates vouchers if same clave de acceso appears across steps', async () => {
    const mockExecutor = vi.fn().mockImplementation(async () => [sampleVoucher1]);

    const runner = new BatchQueryRunner({
      steps,
      interStepDelayMs: 5,
      executeStepFn: mockExecutor,
    });

    const result = await runner.run();
    expect(result.totalFound).toBe(1);
    expect(result.vouchers).toHaveLength(1);
  });

  it('can be cancelled midway', async () => {
    const executedSteps: string[] = [];

    const runner = new BatchQueryRunner({
      steps,
      interStepDelayMs: 5,
      executeStepFn: async (step) => {
        executedSteps.push(step.formattedLabel);
        runner.cancel();
        return [sampleVoucher1];
      },
    });

    const result = await runner.run();
    expect(result.status).toBe('cancelled');
    expect(executedSteps).toHaveLength(1);
  });

  it('populates calendar inputs when running default execute step on emitidos page', async () => {
    document.body.innerHTML = `
      <form id="frmPrincipal">
        <input type="text" id="frmPrincipal:calendarFechaDesde_input" />
        <input type="text" id="frmPrincipal:calendarFechaHasta_input" />
        <button id="frmPrincipal:btnBuscar" type="button">Consultar</button>
      </form>
    `;

    const runner = new BatchQueryRunner({
      steps: [steps[0]],
      interStepDelayMs: 5,
    });

    // @ts-expect-error test private method directly
    await runner.defaultExecuteStep(steps[0]);

    const desde = document.getElementById('frmPrincipal:calendarFechaDesde_input') as HTMLInputElement;
    expect(desde.value).toBe('01/01/2024');
  });
});
