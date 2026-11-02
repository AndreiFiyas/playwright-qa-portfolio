import type { Browser, BrowserContext, Page, TestInfo } from '@playwright/test';
import { test as playwrightTest } from '@playwright/test';
import { Modals } from '@ui/modals/Modals';
import { Pages } from '@ui/pages/Pages';
import { BrowserMocks } from '@ui/utils/browser-mocks';
import { WsMonitor } from '@ui/utils/ws-monitor';
import { test as base, type SessionUser } from './api.fixture';
import { applyStepFailurePatch, stepFailureContext } from './step-failure';

/** An extra browser session (second device / second user) with its own page objects. */
export type Session = { page: Page; pages: Pages; modals: Modals };

type UiFixtures = {
  /** Inject a signed-in session before the test. Login tests turn it off. */
  signedIn: boolean;
  wsMonitor: WsMonitor;
  pages: Pages;
  modals: Modals;
  browserMocks: BrowserMocks;
  /** Opens another signed-in browser context for the same user — e.g. a second device. */
  openSession: () => Promise<Session>;
  authenticate: void;
  stepFailureScreenshots: void;
  failureContext: void;
};

const signIn = async (context: BrowserContext, user: SessionUser, baseURL: string) => {
  await context.addCookies([{ name: 'session', value: user.token, url: baseURL }]);
};

const createSession = async (browser: Browser, user: SessionUser, baseURL: string, testInfo: TestInfo) => {
  const context = await browser.newContext({
    baseURL,
    // Each extra session records its own video so a multi-user failure can be replayed per actor.
    recordVideo: { dir: testInfo.outputPath('sessions') },
  });
  await signIn(context, user, baseURL);
  const page = await context.newPage();
  const session: Session = { page, pages: new Pages(page, new WsMonitor(page)), modals: new Modals(page) };
  return { context, session };
};

/** Layer 3: browser, signed-in session and page objects. */
export const test = base.extend<UiFixtures>({
  signedIn: [true, { option: true }],

  authenticate: [
    async ({ context, user, baseURL, signedIn }, use) => {
      // API login + cookie injection: no test pays for the login UI except the login tests.
      if (signedIn) await signIn(context, user, baseURL!);
      await use();
    },
    { auto: true },
  ],

  wsMonitor: async ({ page }, use) => {
    await use(new WsMonitor(page));
  },

  pages: async ({ page, wsMonitor }, use) => {
    await use(new Pages(page, wsMonitor));
  },

  modals: async ({ page }, use) => {
    await use(new Modals(page));
  },

  browserMocks: async ({ page }, use) => {
    await use(new BrowserMocks(page));
  },

  openSession: async ({ browser, user, baseURL }, use, testInfo) => {
    const opened: { context: BrowserContext; session: Session }[] = [];
    await use(async () => {
      const created = await createSession(browser, user, baseURL!, testInfo);
      opened.push(created);
      return created.session;
    });
    for (const [index, { context, session }] of opened.entries()) {
      const video = session.page.video();
      await context.close();
      if (video && testInfo.status !== testInfo.expectedStatus) {
        await testInfo.attach(`session-${index + 2}-video`, { path: await video.path(), contentType: 'video/webm' });
      }
    }
  },

  stepFailureScreenshots: [
    async ({ page }, use, testInfo) => {
      Object.assign(stepFailureContext, { page, testInfo, startedAt: Date.now() });
      await use();
      Object.assign(stepFailureContext, { page: undefined, testInfo: undefined });
    },
    { auto: true },
  ],

  failureContext: [
    async ({ page }, use, testInfo) => {
      await use();
      if (testInfo.status === testInfo.expectedStatus || page.isClosed()) return;
      await testInfo.attach('failure-url', { body: page.url(), contentType: 'text/plain' });
    },
    { auto: true },
  ],
});

// Steps are created both from tests (`test.step`) and from page objects (`@step` uses the
// base `test`), so both objects get the patch.
applyStepFailurePatch(test);
applyStepFailurePatch(playwrightTest);

export { expect } from '@playwright/test';
