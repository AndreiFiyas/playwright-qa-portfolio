import type { TestDetails } from '@playwright/test';
import type { Feature } from './constants';

type Severity = 'blocker' | 'critical' | 'normal' | 'minor';

/**
 * Fluent builder for test metadata. Produces Playwright-native tags and annotations,
 * which reporters (HTML, Allure, custom) can map to their own fields.
 *
 *   test.describe('Versions', meta().feature(FEATURES.versions).build(), () => {
 *     test('...', meta().testId('VER-001').severity('critical').build(), async () => {});
 *   });
 */
class MetaBuilder {
  private readonly tags: string[] = [];
  private readonly annotations: { type: string; description?: string }[] = [];

  feature(feature: Feature): this {
    this.tags.push(`@${feature}`);
    this.annotations.push({ type: 'feature', description: feature });
    return this;
  }

  testId(id: string): this {
    this.annotations.push({ type: 'testId', description: id });
    return this;
  }

  severity(level: Severity): this {
    this.annotations.push({ type: 'severity', description: level });
    return this;
  }

  /** Attach any extra annotation, e.g. a declarative skip from `@utils/skip`. */
  annotate(annotation: { type: string; description?: string }): this {
    this.annotations.push(annotation);
    return this;
  }

  issue(key: string): this {
    this.annotations.push({ type: 'issue', description: key });
    return this;
  }

  build(): TestDetails {
    return { tag: [...this.tags], annotation: [...this.annotations] };
  }
}

export const meta = () => new MetaBuilder();
