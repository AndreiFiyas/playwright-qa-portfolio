import type { Page, TestInfo, TestType } from '@playwright/test';

const PATCHED = Symbol.for('portfolio.step-failure-patched');
const ATTACHED = Symbol.for('portfolio.step-failure-attached');

type Context = { page?: Page; testInfo?: TestInfo; startedAt: number };

/** Set by an auto fixture for the running test; one test runs at a time per worker. */
export const stepFailureContext: Context = { startedAt: 0 };

const offset = (ms: number) => {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};

/**
 * Wraps `test.step` so the FIRST failing step attaches a screenshot plus a "cue" with the
 * offset from test start — the reader jumps straight to that moment in the video/trace.
 *
 * Must be applied to every `test` object steps are created from (each `extend()` returns
 * a new one); the marker on the error stops nested steps from attaching duplicates.
 */
export function applyStepFailurePatch(testType: TestType<any, any>): void {
  const target = testType as unknown as Record<PropertyKey, unknown> & { step: TestType<any, any>['step'] };
  if (target[PATCHED]) return;
  target[PATCHED] = true;

  const unpatched = target.step;
  const original = unpatched.bind(testType);
  const patched = ((title: string, body: (...args: any[]) => any, options?: object) =>
    original(
      title,
      async (...args: any[]) => {
        try {
          return await body(...args);
        } catch (error) {
          await attachFailure(title, error);
          throw error;
        }
      },
      options,
    )) as TestType<any, any>['step'];
  Object.assign(patched, unpatched); // keep test.step.skip and friends
  target.step = patched;
}

async function attachFailure(title: string, error: unknown): Promise<void> {
  const { page, testInfo, startedAt } = stepFailureContext;
  if (!page || !testInfo || page.isClosed()) return;
  if (error && typeof error === 'object') {
    if ((error as Record<symbol, unknown>)[ATTACHED]) return;
    (error as Record<symbol, unknown>)[ATTACHED] = true;
  }
  const at = offset(Date.now() - startedAt);
  const screenshot = await page.screenshot().catch(() => undefined);
  if (screenshot) await testInfo.attach(`[SCR] step failed: ${title}`, { body: screenshot, contentType: 'image/png' });
  await testInfo.attach(`[CUE] ${at} ${title}`, {
    body: `Step "${title}" failed at ${at} from test start.\nOpen the video or trace at this offset.`,
    contentType: 'text/plain',
  });
}
