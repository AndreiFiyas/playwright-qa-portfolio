import { expect } from '@playwright/test';
import { Component } from '@ui/base/Component';
import { check } from '@ui/utils/soft';
import type { Tool } from '@utils/constants';
import { step } from '@utils/step';

const TOOL_TEST_IDS: Record<Tool, string> = {
  text: 'textTool',
  checkmark: 'checkmarkTool',
  stamp: 'stampTool',
};

export class Toolbar extends Component {
  private readonly toolsMenuButton = this.page.getByTestId('toolsMenuButton');
  private readonly toolsList = this.page.getByTestId('toolsList');
  private readonly undoButton = this.page.getByTestId('undoButton');
  private readonly redoButton = this.page.getByTestId('redoButton');

  @step('Select the {0} tool')
  async selectTool(tool: Tool): Promise<void> {
    // On narrow screens the tools collapse into a menu; the same method serves both layouts.
    if (await this.toolsMenuButton.isVisible()) await this.toolsMenuButton.click();
    const button = this.toolsList.getByTestId(TOOL_TEST_IDS[tool]);
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
  }

  @step('Click on Undo')
  async clickOnUndo(): Promise<void> {
    // History is committed after a debounce. Clicking before the commit is a silent no-op,
    // which used to be "fixed" with sleeps. Waiting for the enabled state is the real signal.
    await expect(this.undoButton).toBeEnabled();
    await this.undoButton.click();
  }

  @step('Click on Redo')
  async clickOnRedo(): Promise<void> {
    await expect(this.redoButton).toBeEnabled();
    await this.redoButton.click();
  }

  @step('Check that Undo is enabled: {0}')
  async checkThatUndoIsEnabled(enabled = true, isSoft = false): Promise<void> {
    await check(isSoft)(this.undoButton).toBeEnabled({ enabled });
  }

  @step('Check that the tools menu is collapsed: {0}')
  async checkThatToolsMenuIsCollapsed(collapsed = true): Promise<void> {
    await expect(this.toolsMenuButton).toBeVisible({ visible: collapsed });
    await expect(this.toolsList).toBeVisible({ visible: !collapsed });
  }
}
