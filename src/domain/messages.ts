import { RetentionVoucher, SriVoucher, QueueState } from './types';

export type ExtensionMessageType =
  | 'RETENTIONS_DETECTED'
  | 'START_DOWNLOAD_QUEUE'
  | 'PAUSE_DOWNLOAD_QUEUE'
  | 'RESUME_DOWNLOAD_QUEUE'
  | 'CLEAR_QUEUE'
  | 'GET_QUEUE_STATE'
  | 'QUEUE_STATE_CHANGED'
  | 'SCAN_PAGE_REQUEST'
  | 'START_IN_PAGE_DOWNLOAD'
  | 'PAUSE_IN_PAGE_DOWNLOAD'
  | 'RESUME_IN_PAGE_DOWNLOAD'
  | 'DOWNLOAD_PROGRESS_UPDATE'
  | 'DOWNLOAD_SRI_TXT_REQUEST'
  | 'BATCH_COMPLETED_NOTIFICATION'
  | 'OPEN_DOWNLOADS_FOLDER'
  | 'ENQUEUE_VOUCHERS';

export interface BaseMessage {
  type: ExtensionMessageType;
}

export interface StartInPageDownloadMessage extends BaseMessage {
  type: 'START_IN_PAGE_DOWNLOAD';
  payload?: {
    retenciones?: RetentionVoucher[];
  };
}

export interface PauseInPageDownloadMessage extends BaseMessage {
  type: 'PAUSE_IN_PAGE_DOWNLOAD';
}

export interface ResumeInPageDownloadMessage extends BaseMessage {
  type: 'RESUME_IN_PAGE_DOWNLOAD';
}

export interface DownloadProgressUpdateMessage extends BaseMessage {
  type: 'DOWNLOAD_PROGRESS_UPDATE';
  payload: {
    total: number;
    completed: number;
    failed: number;
    currentKey?: string;
    isPaused: boolean;
    isFinished: boolean;
  };
}

export interface RetentionsDetectedMessage extends BaseMessage {
  type: 'RETENTIONS_DETECTED';
  payload: {
    retenciones: RetentionVoucher[];
    pageUrl: string;
    timestamp: number;
  };
}

export interface StartDownloadQueueMessage extends BaseMessage {
  type: 'START_DOWNLOAD_QUEUE';
  payload?: {
    retenciones?: RetentionVoucher[];
  };
}

export interface PauseDownloadQueueMessage extends BaseMessage {
  type: 'PAUSE_DOWNLOAD_QUEUE';
}

export interface ResumeDownloadQueueMessage extends BaseMessage {
  type: 'RESUME_DOWNLOAD_QUEUE';
}

export interface ClearQueueMessage extends BaseMessage {
  type: 'CLEAR_QUEUE';
}

export interface GetQueueStateMessage extends BaseMessage {
  type: 'GET_QUEUE_STATE';
}

export interface QueueStateChangedMessage extends BaseMessage {
  type: 'QUEUE_STATE_CHANGED';
  payload: QueueState;
}

export interface ScanPageRequestMessage extends BaseMessage {
  type: 'SCAN_PAGE_REQUEST';
}

export interface DownloadSriTxtRequestMessage extends BaseMessage {
  type: 'DOWNLOAD_SRI_TXT_REQUEST';
}

export interface BatchCompletedNotificationMessage extends BaseMessage {
  type: 'BATCH_COMPLETED_NOTIFICATION';
  payload: {
    total: number;
    completed: number;
    failed: number;
  };
}

export interface OpenDownloadsFolderMessage extends BaseMessage {
  type: 'OPEN_DOWNLOADS_FOLDER';
}

export interface EnqueueVouchersMessage extends BaseMessage {
  type: 'ENQUEUE_VOUCHERS';
  payload: {
    vouchers: SriVoucher[];
    format?: 'XML' | 'PDF';
  };
}

export type ExtensionMessage =
  | RetentionsDetectedMessage
  | StartDownloadQueueMessage
  | PauseDownloadQueueMessage
  | ResumeDownloadQueueMessage
  | ClearQueueMessage
  | GetQueueStateMessage
  | QueueStateChangedMessage
  | ScanPageRequestMessage
  | StartInPageDownloadMessage
  | PauseInPageDownloadMessage
  | ResumeInPageDownloadMessage
  | DownloadProgressUpdateMessage
  | DownloadSriTxtRequestMessage
  | BatchCompletedNotificationMessage
  | OpenDownloadsFolderMessage
  | EnqueueVouchersMessage;

export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
