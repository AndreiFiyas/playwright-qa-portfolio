import type { Page, WebSocketRoute } from '@playwright/test';
import type { RealtimeMessage } from '@contracts/share-widget.contract';
import { TEST_CONFIG } from './test-config';

/**
 * Scripted realtime server built on `page.routeWebSocket`. It keeps the route so a test
 * can push messages nobody asked for (the backend notifying about an accepted invite).
 */
export class RealtimeMock {
  readonly received: RealtimeMessage[] = [];
  private socket?: WebSocketRoute;
  private subscribed!: Promise<void>;

  constructor(private readonly page: Page) {}

  async setUp(): Promise<void> {
    let markSubscribed!: () => void;
    this.subscribed = new Promise((resolve) => (markSubscribed = resolve));
    const host = new URL(TEST_CONFIG.api.realtimeUrl).host;
    await this.page.routeWebSocket(
      (url) => url.host === host,
      (ws) => {
        this.socket = ws;
        ws.onMessage((raw) => {
          const message = JSON.parse(String(raw)) as RealtimeMessage;
          this.received.push(message);
          if (message.type === 'subscribe') markSubscribed();
        });
      },
    );
  }

  /** Waits until the widget has subscribed, then pushes a server-initiated message. */
  async push(message: RealtimeMessage): Promise<void> {
    await this.subscribed;
    this.socket!.send(JSON.stringify(message));
  }
}
