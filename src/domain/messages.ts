import { RetentionVoucher, QueueState } from './types';

export type ExtensionMessageType =
  | 'RETENTIONS_DETECTED'
  | 'START_DOWNLOAD_QUEUE'
  | 'PAUSE_DOWNLOAD_QUEUE'
  | 'RESUME_DOWNLOAD_QUEUE'
  | 'CLEAR_QUEUE'
  | 'GET_QUEUE_STATE'
  | 'QUEUE_STATE_CHANGED'
  | 'SCAN_PAGE_REQUEST';

export interface BaseMessage {
  type: ExtensionMessageType;
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

export type ExtensionMessage =
  | RetentionsDetectedMessage
  | StartDownloadQueueMessage
  | PauseDownloadQueueMessage
  | ResumeDownloadQueueMessage
  | ClearQueueMessage
  | GetQueueStateMessage
  | QueueStateChangedMessage
  | ScanPageRequestMessage;

export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
