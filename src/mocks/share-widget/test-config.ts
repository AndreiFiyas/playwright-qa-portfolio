import type { ShareWidgetConfig } from '@contracts/share-widget.contract';

/**
 * Hosts end in `.invalid` (RFC 6761): they can never resolve, so a request that escapes
 * the mocks fails loudly instead of reaching a real system.
 */
export const TEST_CONFIG: ShareWidgetConfig = {
  documentId: 4242,
  api: {
    baseUrl: 'https://api.test.invalid',
    realtimeUrl: 'wss://realtime.test.invalid/socket',
  },
};
