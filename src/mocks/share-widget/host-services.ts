import type { Page } from '@playwright/test';

export type HostCall = { call: string; args: unknown[] };

declare global {
  interface Window {
    __HOST_CALLS__?: HostCall[];
  }
}

/**
 * The host shell normally provides feedback/logger micro-frontends. In isolation they are
 * replaced with recording Proxies: any method resolves and is logged as `service.method`,
 * so tests assert "the widget asked the host to open feedback" at the call boundary.
 */
export async function installHostServices(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const calls: { call: string; args: unknown[] }[] = [];
    window.__HOST_CALLS__ = calls;
    const service = (name: string) =>
      new Proxy(
        {},
        {
          get: (_target, method) =>
            // `then` must stay undefined, otherwise `await service` treats the proxy as a promise.
            method === 'then'
              ? undefined
              : (...args: unknown[]) => {
                  calls.push({ call: `${name}.${String(method)}`, args });
                  return Promise.resolve();
                },
        },
      );
    (window as unknown as Record<string, unknown>).__HOST_SERVICES__ = {
      feedback: service('feedback'),
      logger: service('logger'),
    };
  });
}

export const readHostCalls = (page: Page): Promise<HostCall[]> => page.evaluate(() => window.__HOST_CALLS__ ?? []);
