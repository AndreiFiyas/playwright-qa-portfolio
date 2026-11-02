export const FEATURES = {
  auth: 'auth',
  documents: 'documents',
  editorTools: 'editor-tools',
  undoRedo: 'undo-redo',
  rearrange: 'rearrange',
  navigation: 'navigation',
  versions: 'versions',
  collaboration: 'collaboration',
  export: 'export',
  share: 'share',
} as const;
export type Feature = (typeof FEATURES)[keyof typeof FEATURES];

export const TOOLS = {
  text: 'text',
  checkmark: 'checkmark',
  stamp: 'stamp',
} as const;
export type Tool = (typeof TOOLS)[keyof typeof TOOLS];

export const EXPORT_STATUS = {
  queued: 'QUEUED',
  processing: 'PROCESSING',
  completed: 'COMPLETED',
} as const;
export type ExportStatus = (typeof EXPORT_STATUS)[keyof typeof EXPORT_STATUS];

export const CONNECTION_STATE = {
  connecting: 'connecting',
  connected: 'connected',
  reconnecting: 'reconnecting',
} as const;
export type ConnectionState = (typeof CONNECTION_STATE)[keyof typeof CONNECTION_STATE];
