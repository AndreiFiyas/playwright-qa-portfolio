import { writeFileSync } from 'node:fs';
import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';

type FlakyEntry = {
  title: string;
  file: string;
  project: string;
  attempts: number;
  failures: string[];
  testId?: string;
};

/**
 * Collects tests that failed at least once and then passed on retry. In CI it runs in the
 * merge-reports job (after all shards are combined), so every flaky test is counted once
 * and the JSON can be pushed to a metrics store to track flakiness over time.
 */
export default class FlakyReporter implements Reporter {
  private readonly flaky = new Map<string, FlakyEntry>();
  private readonly failuresById = new Map<string, string[]>();

  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.status === 'failed' || result.status === 'timedOut') {
      const failures = this.failuresById.get(test.id) ?? [];
      failures.push(result.error?.message?.split('\n')[0] ?? result.status);
      this.failuresById.set(test.id, failures);
    }
    if (test.outcome() === 'flaky') {
      this.flaky.set(test.id, {
        title: test.titlePath().slice(2).join(' › '),
        file: test.location.file.replace(process.cwd() + '/', ''),
        project: test.parent.project()?.name ?? 'unknown',
        attempts: result.retry + 1,
        failures: this.failuresById.get(test.id) ?? [],
        testId: test.annotations.find((a) => a.type === 'testId')?.description,
      });
    }
  }

  onEnd(result: FullResult): void {
    const entries = [...this.flaky.values()];
    writeFileSync('flaky-report.json', JSON.stringify({ status: result.status, flaky: entries }, null, 2));
    if (entries.length) {
      console.log(`\n⚠ ${entries.length} flaky test(s):`);
      entries.forEach((e) => console.log(`  - [${e.project}] ${e.title} (passed on attempt ${e.attempts})`));
    }
  }

  printsToStdio(): boolean {
    return false;
  }
}
