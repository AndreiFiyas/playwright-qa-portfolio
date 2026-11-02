import { expect } from '@playwright/test';
import { BasePage } from '@ui/base/BasePage';
import { step } from '@utils/step';

export class EmailModal extends BasePage {
  // The modal is a role=dialog with an accessible name; data-qa tags address its controls.
  private readonly root = this.page.getByRole('dialog', { name: 'Send by email' });
  private readonly recipientInput = this.root.getByTestId('recipientInput');
  private readonly subjectInput = this.root.getByTestId('subjectInput');
  private readonly sendButton = this.root.getByTestId('sendEmailButton');
  private readonly cancelButton = this.root.getByTestId('cancelEmailButton');
  private readonly error = this.root.getByTestId('emailError');

  @step('Check that the email modal is opened')
  async isOpened(): Promise<void> {
    await expect(this.root).toBeVisible();
  }

  @step('Check that the email modal is closed')
  async checkThatIsClosed(): Promise<void> {
    await expect(this.root).toBeHidden();
  }

  @step('Send the document to "{0}"')
  async send(recipient: string, subject?: string): Promise<void> {
    await this.recipientInput.fill(recipient);
    if (subject !== undefined) await this.subjectInput.fill(subject);
    await this.sendButton.click();
  }

  @step('Check that the subject is prefilled with "{0}"')
  async checkThatSubjectIs(subject: string): Promise<void> {
    await expect(this.subjectInput).toHaveValue(subject);
  }

  @step('Check that the email error says "{0}"')
  async checkThatErrorIs(message: string): Promise<void> {
    await expect(this.error).toHaveText(message);
  }

  @step('Cancel the email modal')
  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }
}
