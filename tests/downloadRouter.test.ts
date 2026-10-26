import { describe, it, expect } from 'vitest';
import { resolveDynamicDownloadPath } from '../src/background/downloadRouter';

describe('Dynamic Download Router (onDeterminingFilename)', () => {
  const validKey = '0101202407019000000000120010010000000011234567813';

  it('routes SRI XML download containing 49-digit key into hierarchical folder', () => {
    const item = {
      id: 1,
      url: 'https://srienlinea.sri.gob.ec/comprobantes-electronicos-internet/descargar?id=123',
      finalUrl: 'https://srienlinea.sri.gob.ec/comprobantes-electronicos-internet/descargar?id=123',
      filename: `${validKey}.xml`,
    } as unknown as chrome.downloads.DownloadItem;

    const path = resolveDynamicDownloadPath(item, 'Kattxo');
    expect(path).toBe(
      `Kattxo/Recibidos/0190000000001/2024/01/Retencion/retencion_${validKey}.xml`
    );
  });

  it('routes SRI PDF/RIDE download into hierarchical folder with .pdf extension', () => {
    const facturaKey = '1508202401179000000000120010020000000451234567812';
    const item = {
      id: 2,
      url: 'https://srienlinea.sri.gob.ec/comprobantes-electronicos-internet/pages/consultas/emitidos/ride?id=456',
      filename: `ride_${facturaKey}.pdf`,
    } as unknown as chrome.downloads.DownloadItem;

    const path = resolveDynamicDownloadPath(item, 'Kattxo');
    expect(path).toBe(
      'Kattxo/Emitidos/1790000000001/2024/08/Factura/factura_1508202401179000000000120010020000000451234567812.pdf'
    );
  });

  it('routes SRI official TXT report into dedicated TXT subfolder', () => {
    const item = {
      id: 3,
      url: 'https://srienlinea.sri.gob.ec/comprobantes-electronicos-internet/reporte',
      filename: 'reporte_listado_comprobantes.txt',
    } as unknown as chrome.downloads.DownloadItem;

    const path = resolveDynamicDownloadPath(item, 'Kattxo');
    expect(path).toContain('Kattxo/Recibidos/Reportes/');
    expect(path).toContain('/TXT/reporte_listado_comprobantes.txt');
  });

  it('ignores downloads from other domains and returns null', () => {
    const item = {
      id: 4,
      url: 'https://github.com/file.zip',
      filename: 'file.zip',
    } as unknown as chrome.downloads.DownloadItem;

    const path = resolveDynamicDownloadPath(item, 'Kattxo');
    expect(path).toBeNull();
  });

  it('applies custom filename pattern when specified (e.g. {ruc}_{numero})', () => {
    const item = {
      id: 5,
      url: 'https://srienlinea.sri.gob.ec/comprobantes-electronicos-internet/descargar?id=123',
      finalUrl: 'https://srienlinea.sri.gob.ec/comprobantes-electronicos-internet/descargar?id=123',
      filename: `${validKey}.xml`,
    } as unknown as chrome.downloads.DownloadItem;

    const path = resolveDynamicDownloadPath(item, 'Kattxo', '{ruc}_{numero}');
    expect(path).toBe(
      'Kattxo/Recibidos/0190000000001/2024/01/Retencion/0190000000001_001-001-000000001.xml'
    );
  });
});
