import type { ShareSettingsResponse } from '@contracts/share-widget.contract';

export const SHARE_SETTINGS: ShareSettingsResponse = {
  name: 'Quarterly report',
  permissions: ['view', 'comment', 'edit'],
  sharedWith: [{ email: 'teammate@example.test', status: 'Accepted' }],
};

export const SHARE_LINK = '/s/abc123def456';
