import type { Page } from '@playwright/test';

/**
 * Base for page-object components. `page` is assigned by the base constructor, so
 * subclasses can declare their locators as field initializers.
 */
export abstract class Component {
  constructor(protected readonly page: Page) {}
}
