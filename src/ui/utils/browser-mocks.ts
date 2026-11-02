import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { step } from '@utils/step';

declare global {
  interface Window {
    __printCalls?: number;
  }
}

/**
 * Stand-ins for browser-native UI that automation cannot drive. The native print dialog
 * blocks headless browsers, so `window.print` is replaced with a counter and the test
 * asserts that the app asked for it — the boundary we own.
 */
export class BrowserMocks {
  constructor(private readonly page: Page) {}

  @step('Stub window.print')
  async stubPrint(): Promise<void> {
    await this.page.addInitScript(() => {
      window.__printCalls = 0;
      window.print = () => {
        window.__printCalls = (window.__printCalls ?? 0) + 1;
      };
    });
  }

  @step('Freeze the browser clock at {0}')
  async freezeTime(isoDate: string): Promise<void> {
    // Only Date is fixed; timers keep running, so debounces and polling still work.
    await this.page.clock.setFixedTime(new Date(isoDate));
  }

  /** Makes matching requests fail with the given status — for error states the backend cannot produce on demand. */
  @step('Answer {0} with HTTP {1}')
  async failRequests(urlGlob: string, status: number): Promise<void> {
    await this.page.route(urlGlob, (route) => route.fulfill({ status, json: { error: 'INJECTED_FAILURE' } }));
  }

  @step('Check that the print dialog was requested {0} time(s)')
  async checkThatPrintWasRequested(times = 1): Promise<void> {
    await expect.poll(() => this.page.evaluate(() => window.__printCalls ?? 0)).toBe(times);
  }
}
