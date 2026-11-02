/**
 * Public contract of the share widget, owned by the widget itself.
 * Component tests import these types, so a contract change breaks the test config at
 * compile time instead of silently drifting.
 */
export type ShareWidgetConfig = {
  documentId: number;
  api: {
    baseUrl: string;
    realtimeUrl: string;
  };
};

export type Permission = 'view' | 'edit' | 'comment';

export type ShareSettingsResponse = {
  name: string;
  permissions: Permission[];
  sharedWith: { email: string; status: 'Pending' | 'Accepted' }[];
};

export type ShareRequest = { documentId: number; email: string; permission: Permission };
export type ShareResponse = { link: string; permission: Permission };

/** Services the host shell provides to every embedded widget. */
export type HostServices = {
  feedback: { open(options: { source: string }): Promise<void> };
  logger: { error(message: string, details?: Record<string, unknown>): Promise<void> };
};

export type RealtimeMessage =
  | { type: 'subscribe'; documentId: number }
  | { type: 'invite-accepted'; email: string };
