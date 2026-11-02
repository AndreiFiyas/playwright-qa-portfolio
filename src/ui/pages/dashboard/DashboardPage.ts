import { expect } from '@playwright/test';
import { BasePage } from '@ui/base/BasePage';
import { step } from '@utils/step';

export class DashboardPage extends BasePage {
  private readonly root = this.page.getByTestId('dashboard');
  private readonly items = this.page.getByTestId('documentListItem');

  @step('Check that the dashboard is opened')
  async isOpened(): Promise<void> {
    await expect(this.page).toHaveURL('/');
    await expect(this.root).toBeVisible();
  }

  @step('Check that "{0}" is listed on the dashboard')
  async checkThatDocumentIsListed(name: string): Promise<void> {
    await expect(this.items.filter({ hasText: name })).toHaveCount(1);
  }
}
