import { expect } from '@playwright/test';
import { Component } from '@ui/base/Component';
import { step } from '@utils/step';

/** Contextual actions shown while an element is selected. */
export class SelectedActionsBar extends Component {
  private readonly root = this.page.getByTestId('selectedActionsBar');

  @step('Check that the selected-element actions are visible: {0}')
  async checkThatIsVisible(visible = true): Promise<void> {
    await expect(this.root).toBeVisible({ visible });
  }

  @step('Click on Duplicate')
  async clickOnDuplicate(): Promise<void> {
    await this.root.getByTestId('duplicateElementButton').click();
  }

  @step('Click on Delete')
  async clickOnDelete(): Promise<void> {
    await this.root.getByTestId('deleteElementButton').click();
  }
}
