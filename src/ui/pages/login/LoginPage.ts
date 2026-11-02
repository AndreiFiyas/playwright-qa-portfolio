import { expect } from '@playwright/test';
import { BasePage } from '@ui/base/BasePage';
import { step } from '@utils/step';

export class LoginPage extends BasePage {
  private readonly form = this.page.getByTestId('loginForm');
  private readonly emailInput = this.page.getByTestId('emailInput');
  private readonly passwordInput = this.page.getByTestId('passwordInput');
  private readonly signInButton = this.page.getByTestId('signInButton');
  private readonly error = this.page.getByTestId('loginError');

  @step('Open the login page')
  async open(): Promise<void> {
    await this.page.goto('/login');
    await this.isOpened();
  }

  @step('Check that the login page is opened')
  async isOpened(): Promise<void> {
    await expect(this.form).toBeVisible();
  }

  @step('Sign in as {0}')
  async signIn(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }

  @step('Check that the login error is shown')
  async checkThatErrorIsShown(): Promise<void> {
    await expect(this.error).toHaveText('Wrong email or password');
  }
}
