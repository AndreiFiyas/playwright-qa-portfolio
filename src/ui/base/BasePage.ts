import type { Page } from '@playwright/test';

/** Every page and modal can tell whether it is open — tests start from a known state. */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  abstract isOpened(): Promise<void>;
}
