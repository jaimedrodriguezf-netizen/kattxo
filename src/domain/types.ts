/**
 * Códigos oficiales de tipos de comprobantes electrónicos del SRI (Ecuador):
 * 01: Factura
 * 03: Liquidación de compra de bienes y prestación de servicios
 * 04: Nota de crédito
 * 05: Nota de débito
 * 06: Guía de remisión
 * 07: Comprobante de retención
 */
export type SriDocumentTypeCode = '01' | '03' | '04' | '05' | '06' | '07' | string;

export type VoucherCategory = 'recibidos' | 'emitidos';

export type VoucherDownloadFormat = 'xml' | 'pdf';

export interface TaxpayerProfile {
  ruc: string;
  razonSocial?: string;
  nombreComercial?: string;
}

export interface SriDownloadPathOptions {
  taxpayerRuc?: string;
  category?: VoucherCategory;
  format?: VoucherDownloadFormat;
  baseDirectory?: string;
}

/**
 * Representa cualquier Comprobante Electrónico oficial del SRI (Ecuador).
 */
export interface SriVoucher {
  /** Clave de acceso única de 49 dígitos numéricos */
  claveAcceso: string;
  /** RUC del emisor */
  rucEmisor: string;
  /** Razón social o nombres del emisor */
  razonSocialEmisor: string;
  /** Identificación del receptor/cliente/sujeto retenido */
  identificacionSujetoRetenido?: string;
  /** Razón social del receptor */
  razonSocialReceptor?: string;
  /** Número de comprobante formato 000-000-000000000 */
  numeroComprobante: string;
  /** Fecha de emisión (DD/MM/YYYY) */
  fechaEmision: string;
  /** Fecha de autorización por el SRI */
  fechaAutorizacion?: string;
  /** Código SRI del comprobante (ej. '01', '04', '07') */
  tipoComprobante: SriDocumentTypeCode;
  /** Estado de autorización en el SRI (ej. 'AUTORIZADO') */
  estado?: string;
  /** ID del elemento DOM en la tabla JSF (ej. 'frmPrincipal:tablaCompRecibidos:0:lnkXml') */
  elementId?: string;
  /** ID del elemento DOM para RIDE PDF si existe */
  elementPdfId?: string;
  /** Categoría: recibidos o emitidos */
  categoria?: VoucherCategory;
}

/**
 * Alias de compatibilidad hacia atrás para retenciones.
 */
export type RetentionVoucher = SriVoucher;

export type DownloadStatus = 'idle' | 'pending' | 'downloading' | 'completed' | 'failed' | 'paused';

export interface DownloadItem {
  id: string; // claveAcceso o claveAcceso_format
  voucher: SriVoucher;
  format?: VoucherDownloadFormat;
  status: DownloadStatus;
  retryCount: number;
  maxRetries: number;
  error?: string;
  addedAt: number;
  completedAt?: number;
}

export interface QueueStats {
  total: number;
  pending: number;
  downloading: number;
  completed: number;
  failed: number;
  isPaused: boolean;
  isRunning: boolean;
}

export interface QueueState {
  items: DownloadItem[];
  stats: QueueStats;
  currentActiveKey?: string;
}

export interface QueueConfig {
  /** Delay en ms entre descargas sucesivas para evitar 429 del SRI */
  delayBetweenRequestsMs: number;
  /** Número máximo de reintentos por comprobante */
  maxRetries: number;
  /** Concurrencia máxima (en SRI conviene 1 para evitar ban) */
  concurrency: number;
  /** Subdirectorio donde guardar en chrome.downloads (ej. 'Kattxo/Retenciones') */
  downloadSubdirectory: string;
}

export const DEFAULT_QUEUE_CONFIG: QueueConfig = {
  delayBetweenRequestsMs: 350,
  maxRetries: 3,
  concurrency: 1,
  downloadSubdirectory: 'Kattxo/Retenciones',
};
