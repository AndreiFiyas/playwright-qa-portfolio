import { expect } from '@playwright/test';
import { Component } from '@ui/base/Component';
import type { ConnectionState } from '@utils/constants';
import { step } from '@utils/step';

export class EditorHeader extends Component {
  private readonly title = this.page.getByTestId('documentTitle');
  private readonly connection = this.page.getByTestId('connectionStatus');
  private readonly printButton = this.page.getByTestId('printButton');
  private readonly emailButton = this.page.getByTestId('emailButton');

  @step('Check that the document title is "{0}"')
  async checkThatTitleIs(title: string): Promise<void> {
    await expect(this.title).toHaveText(title);
  }

  @step('Check that the connection is {0}')
  async checkThatConnectionIs(state: ConnectionState): Promise<void> {
    await expect(this.connection).toHaveAttribute('data-state', state);
  }

  @step('Click on Print')
  async clickOnPrint(): Promise<void> {
    await this.printButton.click();
  }

  @step('Click on Email')
  async clickOnEmail(): Promise<void> {
    await this.emailButton.click();
  }
}
