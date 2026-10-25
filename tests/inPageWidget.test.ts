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

  it('does not create duplicate hosts if mounted multiple times', () => {
    const widget = new InPageWidget();
    widget.mount(document.body);
    widget.mount(document.body);

    const hosts = document.querySelectorAll('#kattxo-sri-widget-host');
    expect(hosts.length).toBe(1);
  });
});
