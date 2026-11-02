import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { step } from '@utils/step';

export class Toast {
  private readonly root;

  constructor(page: Page) {
    this.root = page.getByTestId('toast');
  }

  @step('Check that the toast says "{0}"')
  async checkThatMessageIs(text: string): Promise<void> {
    await expect(this.root).toHaveText(text, { timeout: 15_000 });
  }
}
