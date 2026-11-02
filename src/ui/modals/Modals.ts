import type { Page } from '@playwright/test';
import { EmailModal } from './EmailModal';

export class Modals {
  readonly email: EmailModal;

  constructor(page: Page) {
    this.email = new EmailModal(page);
  }
}
