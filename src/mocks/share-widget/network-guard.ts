import type { BrowserContext } from '@playwright/test';

type AllowEntry = { host: string; why: string };

/** Hosts the harness may reach for real. Every exception carries its justification. */
const ALLOW_LIST: AllowEntry[] = [{ host: 'localhost', why: 'the harness page and the widget bundle' }];

/** Third-party scripts the host page loads; answered locally with an empty body. */
const LOCALLY_ANSWERED: AllowEntry[] = [{ host: 'analytics.test.invalid', why: 'host page analytics tag' }];

/**
 * Deny-by-default network policy for component tests.
 *
 * One catch-all route is registered on the context (so popups are covered too); specific
 * mocks are registered later on the page and therefore win. Anything that reaches the
 * catch-all is aborted and recorded, and the fixture fails the test at teardown with a
 * message that tells the author which mock to add.
 */
export class NetworkGuard {
  readonly escaped: string[] = [];

  async install(context: BrowserContext): Promise<void> {
    await context.route('**/*', async (route) => {
      const { hostname } = new URL(route.request().url());
      if (ALLOW_LIST.some((entry) => entry.host === hostname)) return route.continue();
      if (LOCALLY_ANSWERED.some((entry) => entry.host === hostname)) {
        return route.fulfill({ status: 200, contentType: 'text/javascript', body: '' });
      }
      this.escaped.push(`${route.request().method()} ${route.request().url()}`);
      return route.abort('blockedbyclient');
    });

    await context.routeWebSocket(
      (url) => !ALLOW_LIST.some((entry) => entry.host === url.hostname),
      (ws) => {
        this.escaped.push(`WS ${ws.url()}`);
        void ws.close();
      },
    );
  }
}
