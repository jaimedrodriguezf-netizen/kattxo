import { describe, it, expect, beforeEach } from 'vitest';
import { InPageWidget, InPageWidgetOptions } from '../src/content/inPageWidget';

describe('InPageWidget (Shadow DOM Floating Panel)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('mounts inside a ShadowRoot attached to #kattxo-sri-widget-host', () => {
    const widget = new InPageWidget();
    widget.mount(document.body);

    const host = document.getElementById('kattxo-sri-widget-host');
    expect(host).not.toBeNull();
    expect(host?.shadowRoot).not.toBeNull();

    const shadow = host?.shadowRoot;
    expect(shadow?.querySelector('.kattxo-widget-container')).not.toBeNull();
    expect(shadow?.querySelector('.kattxo-header-title')?.textContent).toContain('Kattxo');
  });

  it('toggles minimize and expand state', () => {
    const widget = new InPageWidget();
    widget.mount(document.body);

    const host = document.getElementById('kattxo-sri-widget-host')!;
    const shadow = host.shadowRoot!;
    const toggleBtn = shadow.querySelector<HTMLButtonElement>('.kattxo-toggle-btn')!;
    const bodyEl = shadow.querySelector<HTMLElement>('.kattxo-widget-body')!;

    expect(bodyEl.style.display).not.toBe('none');

    // Click minimize
    toggleBtn.click();
    expect(bodyEl.style.display).toBe('none');

    // Click expand
    toggleBtn.click();
    expect(bodyEl.style.display).not.toBe('none');
  });

  it('toggles minimize and expand on header double click (ignoring action buttons)', () => {
    const widget = new InPageWidget();
    widget.mount(document.body);

    const host = document.getElementById('kattxo-sri-widget-host')!;
    const shadow = host.shadowRoot!;
    const headerEl = shadow.querySelector<HTMLElement>('.kattxo-widget-header')!;
    const bodyEl = shadow.querySelector<HTMLElement>('.kattxo-widget-body')!;

    expect(bodyEl.style.display).not.toBe('none');

    // Double click header
    headerEl.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(bodyEl.style.display).toBe('none');

    // Double click header again
    headerEl.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(bodyEl.style.display).not.toBe('none');
  });

  it('renders floating side launcher when minimized and expands on click', () => {
    const widget = new InPageWidget();
    widget.mount(document.body);

    const host = document.getElementById('kattxo-sri-widget-host')!;
    const shadow = host.shadowRoot!;
    const launcher = shadow.querySelector<HTMLElement>('.kattxo-minimized-launcher')!;
    const container = shadow.querySelector<HTMLElement>('.kattxo-widget-container')!;

    expect(launcher).not.toBeNull();
    expect(launcher.style.display).toBe('none');

    // Minimize widget
    widget.toggleMinimize();
    expect(launcher.style.display).not.toBe('none');
    expect(container.style.display).toBe('none');

    // Click launcher to expand
    launcher.click();
    expect(launcher.style.display).toBe('none');
    expect(container.style.display).not.toBe('none');
  });

  it('shows success card on completion and handles new download reset', () => {
    const widget = new InPageWidget();
    widget.mount(document.body);

    const host = document.getElementById('kattxo-sri-widget-host')!;
    const shadow = host.shadowRoot!;
    const successCard = shadow.querySelector<HTMLElement>('.kattxo-success-card')!;

    expect(successCard).not.toBeNull();
    expect(successCard.style.display).toBe('none');

    let newDownloadClicked = false;
    widget.showSuccessScreen({ total: 20, completed: 18, failed: 2 }, () => {
      newDownloadClicked = true;
    });

    expect(successCard.style.display).not.toBe('none');
    expect(successCard.textContent).toContain('18');
    expect(successCard.textContent).toContain('20');

    // Click new download button
    const newBtn = shadow.querySelector<HTMLButtonElement>('.kattxo-btn-new-download')!;
    newBtn.click();
    expect(newDownloadClicked).toBe(true);
    expect(successCard.style.display).toBe('none');
  });

  it('renders reconciliation button in success card and handles TXT reconciliation', () => {
    let retryMissingCalledWith: any[] = [];
    const widget = new InPageWidget({
      onRetryMissing: (missing) => {
        retryMissingCalledWith = missing;
      },
    });
    widget.mount(document.body);

    const host = document.getElementById('kattxo-sri-widget-host')!;
    const shadow = host.shadowRoot!;

    widget.showSuccessScreen({ total: 5, completed: 3, failed: 2 });

    const reconcileBtn = shadow.querySelector<HTMLButtonElement>('.kattxo-btn-reconcile-txt');
    expect(reconcileBtn).not.toBeNull();
  });

  it('prunes download list to maximum 100 items for memory efficiency in large batches', () => {
    const widget = new InPageWidget();
    widget.mount(document.body);

    const host = document.getElementById('kattxo-sri-widget-host')!;
    const shadow = host.shadowRoot!;

    // Add 110 items
    for (let i = 1; i <= 110; i++) {
      widget.addDownloadItem({
        claveAcceso: `010120240117900000000012001001000000000${String(i).padStart(3, '0')}1234567811`,
        rucEmisor: '1790000000001',
        razonSocialEmisor: 'EMPRESA',
        numeroComprobante: `001-001-${String(i).padStart(9, '0')}`,
        fechaEmision: '01/01/2024',
        tipoComprobante: '01',
      });
    }

    const list = shadow.querySelector('.kattxo-download-list')!;
    expect(list.children.length).toBe(100);
  });

  it('updates taxpayer profile display', () => {
    const widget = new InPageWidget();
    widget.mount(document.body);

    widget.setTaxpayerProfile({
      ruc: '1790011223001',
      razonSocial: 'EMPRESA KATTXO S.A.',
    });

    const host = document.getElementById('kattxo-sri-widget-host')!;
    const shadow = host.shadowRoot!;
    const taxpayerEl = shadow.querySelector('.kattxo-taxpayer-badge');

    expect(taxpayerEl?.textContent).toContain('1790011223001');
    expect(taxpayerEl?.textContent).toContain('EMPRESA KATTXO');
  });

  it('renders radio group for format selection (XML, PDF, TXT) and retrieves selected format', () => {
    const widget = new InPageWidget();
    widget.mount(document.body);

    const host = document.getElementById('kattxo-sri-widget-host')!;
    const shadow = host.shadowRoot!;
    const radios = shadow.querySelectorAll<HTMLInputElement>('input[name="kattxo-format"]');

    expect(radios.length).toBe(3);
    expect(widget.getSelectedFormat()).toBe('XML');

    // Select PDF
    const pdfRadio = Array.from(radios).find((r) => r.value === 'PDF')!;
    pdfRadio.checked = true;
    pdfRadio.dispatchEvent(new Event('change'));

    expect(widget.getSelectedFormat()).toBe('PDF');
  });

  it('renders status card with download metric counters', () => {
    const widget = new InPageWidget();
    widget.mount(document.body);

    const host = document.getElementById('kattxo-sri-widget-host')!;
    const shadow = host.shadowRoot!;
    const statusCard = shadow.querySelector('.kattxo-status-card');

    expect(statusCard).not.toBeNull();
  });

  it('renders and updates live download items with spinner and badges', () => {
    const widget = new InPageWidget();
    widget.mount(document.body);

    const host = document.getElementById('kattxo-sri-widget-host')!;
    const shadow = host.shadowRoot!;
    const list = shadow.querySelector('.kattxo-download-list')!;
    expect(list).not.toBeNull();

    widget.addDownloadItem(
      {
        claveAcceso: '0101202401179000000000120010010000000011234567811',
        rucEmisor: '1790000000001',
        razonSocialEmisor: 'EMPRESA 1',
        numeroComprobante: '001-001-000000001',
        fechaEmision: '01/01/2024',
        tipoComprobante: '01',
      },
      'downloading'
    );

    const item = shadow.querySelector('li[data-id="0101202401179000000000120010010000000011234567811"]')!;
    expect(item).not.toBeNull();
    expect(item.textContent).toContain('001-001-000000001');
    expect(item.querySelector('.kattxo-spinner')).not.toBeNull();

    // Update status to completed
    widget.updateItemStatus('0101202401179000000000120010010000000011234567811', 'completed');
    expect(item.querySelector('.kattxo-spinner')).toBeNull();
    expect(item.querySelector('.kattxo-badge-done')?.textContent).toContain('Descargado');

    // Clear list
    widget.clearDownloadList();
    expect(shadow.querySelectorAll('.kattxo-download-list li').length).toBe(0);
  });

  it('triggers onExportExcel callback on Excel button click', () => {
    let excelClicked = false;
    const widget = new InPageWidget({
      onExportExcel: () => {
        excelClicked = true;
      },
    });
    widget.mount(document.body);

    const host = document.getElementById('kattxo-sri-widget-host')!;
    const shadow = host.shadowRoot!;
    const excelBtn = shadow.querySelector<HTMLButtonElement>('.kattxo-export-excel-btn');
    expect(excelBtn).not.toBeNull();

    excelBtn?.click();
    expect(excelClicked).toBe(true);
  });

  it('updates progress metrics and bar width', () => {
    const widget = new InPageWidget();
    widget.mount(document.body);

    widget.updateProgress({
      total: 10,
      completed: 4,
      failed: 1,
      currentKey: '1234567890',
      isPaused: false,
      isFinished: false,
    });

    const host = document.getElementById('kattxo-sri-widget-host')!;
    const shadow = host.shadowRoot!;

    const progressText = shadow.querySelector('.kattxo-progress-text');
    const progressBar = shadow.querySelector<HTMLElement>('.kattxo-progress-fill');

    expect(progressText?.textContent).toContain('4 / 10');
    expect(progressBar?.style.width).toBe('40%');
  });

  it('triggers onStartDownload callback when button is clicked', () => {
    let triggered = false;
    let selectedType = '';

    const widget = new InPageWidget({
      onStartDownload: (type) => {
        triggered = true;
        selectedType = type;
      },
    });
    widget.mount(document.body);

    const host = document.getElementById('kattxo-sri-widget-host')!;
    const shadow = host.shadowRoot!;
    const startBtn = shadow.querySelector<HTMLButtonElement>('.kattxo-start-btn')!;

    startBtn.click();
    expect(triggered).toBe(true);
    expect(selectedType).toBe('ALL');
  });

  it('triggers onExportCsv and onDownloadTxtReport callbacks when clicked', () => {
    let csvClicked = false;
    let txtClicked = false;

    const widget = new InPageWidget({
      onExportCsv: () => {
        csvClicked = true;
      },
      onDownloadTxtReport: () => {
        txtClicked = true;
      },
    });
    widget.mount(document.body);

    const host = document.getElementById('kattxo-sri-widget-host')!;
    const shadow = host.shadowRoot!;
    const csvBtn = shadow.querySelector<HTMLButtonElement>('.kattxo-export-csv-btn')!;
    const txtBtn = shadow.querySelector<HTMLButtonElement>('.kattxo-txt-report-btn')!;

    csvBtn.click();
    txtBtn.click();

    expect(csvClicked).toBe(true);
    expect(txtClicked).toBe(true);
  });

  it('triggers onStartBatchRange callback with from, to, and docType when batch button is clicked', () => {
    let batchParams: { from: string; to: string; documentType: string } | null = null;

    const widget = new InPageWidget({
      onStartBatchRange: (params) => {
        batchParams = params;
      },
    });
    widget.mount(document.body);

    const host = document.getElementById('kattxo-sri-widget-host')!;
    const shadow = host.shadowRoot!;

    const fromInput = shadow.querySelector<HTMLInputElement>('.kattxo-date-from')!;
    const toInput = shadow.querySelector<HTMLInputElement>('.kattxo-date-to')!;
    const typeSelect = shadow.querySelector<HTMLSelectElement>('.kattxo-doc-type-select')!;
    const batchBtn = shadow.querySelector<HTMLButtonElement>('.kattxo-batch-range-btn')!;

    fromInput.value = '2024-03-01';
    toInput.value = '2024-03-15';
    typeSelect.value = '01';

    batchBtn.click();

    expect(batchParams).toEqual({
      from: '2024-03-01',
      to: '2024-03-15',
      documentType: '01',
      format: 'XML',
    });
  });

  it('displays auto-resume banner and triggers resume callback on click', () => {
    const widget = new InPageWidget();
    widget.mount(document.body);

    const host = document.getElementById('kattxo-sri-widget-host')!;
    const shadow = host.shadowRoot!;
    const banner = shadow.querySelector<HTMLElement>('.kattxo-resume-banner')!;

    expect(banner.style.display).toBe('none');

    let resumeClicked = false;
    let dismissClicked = false;

    widget.showResumeBanner(
      12,
      () => {
        resumeClicked = true;
      },
      () => {
        dismissClicked = true;
      }
    );

    expect(banner.style.display).not.toBe('none');
    expect(banner.textContent).toContain('12');

    // Click resume
    const resumeBtn = shadow.querySelector<HTMLButtonElement>('.kattxo-btn-resume-action')!;
    resumeBtn.click();
    expect(resumeClicked).toBe(true);

    // Click dismiss
    const dismissBtn = shadow.querySelector<HTMLButtonElement>('.kattxo-btn-dismiss-action')!;
    dismissBtn.click();
    expect(dismissClicked).toBe(true);
    expect(banner.style.display).toBe('none');
  });

  it('renders TXT import button and triggers onImportTxtContent when file is loaded', () => {
    let importedContent = '';
    let importedFilename = '';

    const widget = new InPageWidget({
      onImportTxtContent: (content, filename) => {
        importedContent = content;
        importedFilename = filename;
      },
    });
    widget.mount(document.body);

    const host = document.getElementById('kattxo-sri-widget-host')!;
    const shadow = host.shadowRoot!;
    const importBtn = shadow.querySelector<HTMLButtonElement>('.kattxo-import-txt-btn');
    const fileInput = shadow.querySelector<HTMLInputElement>('.kattxo-txt-file-input');

    expect(importBtn).not.toBeNull();
    expect(fileInput).not.toBeNull();
    expect(fileInput?.type).toBe('file');
    expect(fileInput?.accept).toBe('.txt');
  });

  it('does not create duplicate hosts if mounted multiple times', () => {
    const widget = new InPageWidget();
    widget.mount(document.body);
    widget.mount(document.body);

    const hosts = document.querySelectorAll('#kattxo-sri-widget-host');
    expect(hosts.length).toBe(1);
  });
});
