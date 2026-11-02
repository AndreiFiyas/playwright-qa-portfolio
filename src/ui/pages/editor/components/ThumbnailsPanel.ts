import { expect } from '@playwright/test';
import { Component } from '@ui/base/Component';
import { step } from '@utils/step';

export class ThumbnailsPanel extends Component {
  private readonly thumbnails = this.page.getByTestId('pageThumbnail');

  private thumbnail(pageNumber: number) {
    return this.page.locator(`[data-qa="pageThumbnail"][data-page-number="${pageNumber}"]`);
  }

  @step('Move page {0} up')
  async movePageUp(pageNumber: number): Promise<void> {
    await this.thumbnail(pageNumber).getByTestId('movePageUpButton').click();
  }

  @step('Move page {0} down')
  async movePageDown(pageNumber: number): Promise<void> {
    await this.thumbnail(pageNumber).getByTestId('movePageDownButton').click();
  }

  @step('Check that the page order is {0}')
  async checkThatPageOrderIs(order: number[]): Promise<void> {
    await expect(this.thumbnails).toHaveCount(order.length);
    await expect
      .poll(() => this.thumbnails.evaluateAll((nodes) => nodes.map((n) => Number((n as HTMLElement).dataset.pageNumber))))
      .toEqual(order);
  }

  @step('Check that page {0} is the active page')
  async checkThatActivePageIs(pageNumber: number): Promise<void> {
    await expect(this.thumbnail(pageNumber)).toHaveClass(/thumbnail--active/);
  }
}
