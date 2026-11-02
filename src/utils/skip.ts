import type { TestInfo } from '@playwright/test';

/**
 * Declarative skips. Tests never call `test.skip()` directly (lint: custom/no-test-skip);
 * they attach an annotation with a reason, and an auto fixture applies it. This keeps every
 * muted test searchable by reason and linked to the issue that blocks it.
 *
 *   test('...', { annotation: [skipOnBrowser(['webkit'], 'native print dialog')] }, ...)
 */
const SKIP = 'skip-when';

type SkipRule = { browsers?: string[]; platforms?: NodeJS.Platform[]; issue?: string; reason: string };

const annotation = (rule: SkipRule) => ({ type: SKIP, description: JSON.stringify(rule) });

export const skipOnBrowser = (browsers: string[], reason: string) => annotation({ browsers, reason });

/** Pixel baselines are rendered on Linux (CI); other OSes anti-alias fonts differently. */
export const skipOnPlatform = (platforms: NodeJS.Platform[], reason: string) => annotation({ platforms, reason });

/** Mute until the linked issue is fixed. The issue key keeps the mute visible in reports. */
export const skipOnIssue = (issue: string, reason: string) => annotation({ issue, reason });

export const handleSkipAnnotations = (testInfo: TestInfo, browserName: string): void => {
  for (const { type, description } of testInfo.annotations) {
    if (type !== SKIP || !description) continue;
    const rule = JSON.parse(description) as SkipRule;
    const browserMatches = !rule.browsers || rule.browsers.includes(browserName);
    const platformMatches = !rule.platforms || rule.platforms.includes(process.platform);
    if (browserMatches && platformMatches) {
      const prefix = rule.issue ? `[${rule.issue}] ` : '';
      testInfo.skip(true, `${prefix}${rule.reason}`);
    }
  }
};
