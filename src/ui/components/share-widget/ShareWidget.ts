import { expect } from '@playwright/test';
import type { Permission } from '@contracts/share-widget.contract';
import { readHostCalls } from '@mocks/share-widget/host-services';
import { BasePage } from '@ui/base/BasePage';
import { step } from '@utils/step';

export class ShareWidget extends BasePage {
  private readonly harnessStatus = this.page.getByTestId('harnessStatus');
  private readonly root = this.page.getByTestId('shareWidget');
  private readonly title = this.root.getByTestId('shareTitle');
  private readonly emailInput = this.root.getByTestId('shareEmailInput');
  private readonly permissionSelect = this.root.getByTestId('sharePermissionSelect');
  private readonly submitButton = this.root.getByTestId('shareSubmitButton');
  private readonly error = this.root.getByTestId('shareError');
  private readonly link = this.root.getByTestId('shareLink');
  private readonly recipients = this.root.getByTestId('recipientRow');
  private readonly feedbackButton = this.root.getByTestId('giveFeedbackButton');

  @step('Open the share widget harness')
  async open(): Promise<void> {
    await this.page.goto('/harness/share-widget.html');
    await this.isOpened();
  }

  @step('Check that the share widget is mounted')
  async isOpened(): Promise<void> {
    await expect(this.harnessStatus).toHaveText('Widget ready');
    await expect(this.root).toBeVisible();
  }

  @step('Share with "{0}" as {1}')
  async shareWith(email: string, permission: Permission = 'view'): Promise<void> {
    await this.emailInput.fill(email);
    await this.permissionSelect.selectOption(permission);
    await this.submitButton.click();
  }

  @step('Click on Give feedback')
  async clickOnGiveFeedback(): Promise<void> {
    await this.feedbackButton.click();
  }

  @step('Check that the title is "{0}"')
  async checkThatTitleIs(title: string): Promise<void> {
    await expect(this.title).toHaveText(title);
  }

  @step('Check that the permission options are {0}')
  async checkThatPermissionsAre(permissions: Permission[]): Promise<void> {
    await expect(this.permissionSelect.locator('option')).toHaveText(permissions);
  }

  @step('Check that the share link "{0}" is shown')
  async checkThatLinkIs(link: string): Promise<void> {
    await expect(this.link).toHaveText(link);
  }

  @step('Check that the error says "{0}"')
  async checkThatErrorIs(message: string): Promise<void> {
    await expect(this.error).toHaveText(message);
  }

  @step('Check that {0} has status "{1}"')
  async checkThatRecipientStatusIs(email: string, status: 'Pending' | 'Accepted'): Promise<void> {
    await expect(this.recipients.filter({ hasText: email }).getByTestId('recipientStatus')).toHaveText(status);
  }

  @step('Check that the host received "{0}"')
  async checkThatHostWasCalled(call: string, args: unknown[]): Promise<void> {
    await expect.poll(() => readHostCalls(this.page)).toContainEqual({ call, args });
  }

  @step('Check that the host received no calls')
  async checkThatHostWasNotCalled(): Promise<void> {
    expect(await readHostCalls(this.page)).toEqual([]);
  }
}
