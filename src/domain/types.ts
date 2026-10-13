/**
 * Representa un Comprobante Electrónico de Retención del SRI (Ecuador).
 * Código de tipo de documento del SRI: '07'.
 */
export interface RetentionVoucher {
  /** Clave de acceso única de 49 dígitos numéricos */
  claveAcceso: string;
  /** RUC del emisor (agente de retención) */
  rucEmisor: string;
  /** Razón social o nombres del emisor */
  razonSocialEmisor: string;
  /** Identificación del sujeto retenido (proveedor/retenido) */
  identificacionSujetoRetenido?: string;
  /** Número de comprobante formato 000-000-000000000 */
  numeroComprobante: string;
  /** Fecha de emisión (DD/MM/YYYY) */
  fechaEmision: string;
  /** Fecha de autorización por el SRI */
  fechaAutorizacion?: string;
  /** Ej. '07' para Retención */
  tipoComprobante: '07' | string;
  /** Estado de autorización en el SRI (ej. 'AUTORIZADO') */
  estado?: string;
  /** Período fiscal (MM/YYYY) si está disponible */
  periodoFiscal?: string;
}

export type DownloadStatus = 'idle' | 'pending' | 'downloading' | 'completed' | 'failed' | 'paused';

export interface DownloadItem {
  id: string; // claveAcceso
  voucher: RetentionVoucher;
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
