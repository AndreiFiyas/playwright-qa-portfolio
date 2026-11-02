import { test as base } from '@playwright/test';
import { handleSkipAnnotations } from '@utils/skip';

type BaseFixtures = {
  autoSkip: void;
};

/**
 * Layer 1 of the fixture chain (base → api → ui). Applies to every test type.
 *
 * - Every request carries an `x-autotest-id` header, so a backend log line can be traced
 *   back to the exact test that produced it.
 * - Declarative skip annotations are applied before the test body runs.
 */
export const test = base.extend<BaseFixtures>({
  extraHTTPHeaders: async ({ extraHTTPHeaders }, use, testInfo) => {
    const run = process.env.GITHUB_RUN_ID ?? 'local';
    await use({ ...extraHTTPHeaders, 'x-autotest-id': `${testInfo.testId};run=${run}` });
  },

  autoSkip: [
    async ({ browserName }, use, testInfo) => {
      handleSkipAnnotations(testInfo, browserName);
      await use();
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
