import { SriDateStep } from '../domain/dateRangeIterator';
import { SriVoucher } from '../domain/types';
import { fillSriQueryForm, triggerSriSearch, getPaginatorState, goToNextPage } from './formAutomator';
import { extractVouchersFromDom } from './parser';

export interface BatchQueryResult {
  status: 'completed' | 'cancelled' | 'paused';
  vouchers: SriVoucher[];
  totalFound: number;
}

export interface BatchQueryConfig {
  steps: SriDateStep[];
  documentType?: string;
  interStepDelayMs?: number;
  doc?: Document;
  onStepStart?: (step: SriDateStep, index: number, total: number) => void;
  onVouchersFound?: (vouchers: SriVoucher[], step: SriDateStep) => void;
  executeStepFn?: (step: SriDateStep) => Promise<SriVoucher[]>;
}

export class BatchQueryRunner {
  private config: BatchQueryConfig;
  private isCancelled = false;
  private isPaused = false;
  private vouchersMap: Map<string, SriVoucher> = new Map();

  constructor(config: BatchQueryConfig) {
    this.config = {
      interStepDelayMs: 1500,
      ...config,
    };
  }

  public cancel(): void {
    this.isCancelled = true;
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;
  }

  public async run(): Promise<BatchQueryResult> {
    this.isCancelled = false;
    this.isPaused = false;
    this.vouchersMap.clear();

    const { steps } = this.config;

    for (let i = 0; i < steps.length; i++) {
      if (this.isCancelled) {
        return {
          status: 'cancelled',
          vouchers: Array.from(this.vouchersMap.values()),
          totalFound: this.vouchersMap.size,
        };
      }

      while (this.isPaused && !this.isCancelled) {
        await this.sleep(300);
      }

      const step = steps[i];
      if (this.config.onStepStart) {
        this.config.onStepStart(step, i + 1, steps.length);
      }

      let stepVouchers: SriVoucher[] = [];
      if (this.config.executeStepFn) {
        stepVouchers = await this.config.executeStepFn(step);
      } else {
        stepVouchers = await this.defaultExecuteStep(step);
      }

      const newVouchers: SriVoucher[] = [];
      for (const v of stepVouchers) {
        if (!this.vouchersMap.has(v.claveAcceso)) {
          this.vouchersMap.set(v.claveAcceso, v);
          newVouchers.push(v);
        }
      }

      if (this.config.onVouchersFound && newVouchers.length > 0) {
        this.config.onVouchersFound(newVouchers, step);
      }

      if (i < steps.length - 1 && !this.isCancelled) {
        await this.sleep(this.config.interStepDelayMs || 1500);
      }
    }

    return {
      status: 'completed',
      vouchers: Array.from(this.vouchersMap.values()),
      totalFound: this.vouchersMap.size,
    };
  }

  private async defaultExecuteStep(step: SriDateStep): Promise<SriVoucher[]> {
    const doc = this.config.doc || (typeof document !== 'undefined' ? document : null);
    if (!doc) return [];

    // 1. Rellenar formulario con los parámetros de la fecha actual (dropdowns o calendar inputs)
    fillSriQueryForm(doc, {
      year: step.year,
      month: step.month,
      day: step.day,
      dateFrom: step.isoString,
      dateTo: step.isoString,
      documentType: this.config.documentType,
    });

    // 2. Disparar búsqueda AJAX en el SRI
    await triggerSriSearch(doc);

    // 3. Esperar a que la tabla JSF responda y se renderice
    await this.sleep(1200);

    // 4. Extraer comprobantes de la primera página
    const vouchers: SriVoucher[] = [...extractVouchersFromDom(doc, this.config.documentType)];

    // 5. Recorrer páginas adicionales si existe paginador
    let paginator = getPaginatorState(doc);
    let pageCount = 1;

    while (paginator.hasNextPage && pageCount < 50 && !this.isCancelled) {
      goToNextPage(doc);
      await this.sleep(1000);
      const pageVouchers = extractVouchersFromDom(doc, this.config.documentType);
      vouchers.push(...pageVouchers);
      paginator = getPaginatorState(doc);
      pageCount++;
    }

    return vouchers;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
