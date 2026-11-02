import { expect } from '@playwright/test';
import { Component } from '@ui/base/Component';
import { check } from '@ui/utils/soft';
import type { Tool } from '@utils/constants';
import { step } from '@utils/step';
import { documentAreaLocators } from './document-area.locators';

export type Point = { x: number; y: number };

export class DocumentArea extends Component {
  private readonly locators = documentAreaLocators(this.page);

  @step('Check that the document is rendered with {0} pages')
  async checkThatPageCountIs(count: number): Promise<void> {
    await expect(this.locators.pages).toHaveCount(count);
  }

  @step('Wait for the document to finish its initial layout')
  async waitForLayout(): Promise<void> {
    // The app applies "fit width" after the first paint and resets scroll when it does.
    // Waiting for the class is waiting for the app's own ready signal — no sleeps.
    await expect(this.locators.root).toHaveClass(/document--fit-width/);
  }

  @step('Click on page {0} at {1}')
  async clickOnPage(pageNumber: number, position: Point = { x: 120, y: 120 }): Promise<void> {
    const target = this.locators.pageByNumber(pageNumber);
    await target.scrollIntoViewIfNeeded();
    await target.click({ position });
  }

  @step('Select element #{0}')
  async selectElement(index: number): Promise<void> {
    await this.locators.elements.nth(index).click();
  }

  @step('Delete the selected element with the keyboard')
  async deleteSelectedWithKeyboard(): Promise<void> {
    const selected = this.locators.root.locator('[data-qa="documentElement"][aria-selected="true"]');
    // Delete acts on the focused node; check focus first so a lost focus fails here,
    // with a clear message, instead of later as "element still exists".
    await expect(selected).toBeFocused();
    await selected.press('Delete');
  }

  @step('Scroll to page {0}')
  async scrollToPage(pageNumber: number): Promise<void> {
    const target = this.locators.pageByNumber(pageNumber);
    // A late rescale may throw the scroll back to page 1; retry the whole intent
    // (scroll + verify) instead of sleeping and hoping the rescale has happened.
    await expect(async () => {
      await target.scrollIntoViewIfNeeded();
      await expect(target).toBeInViewport({ ratio: 0.5, timeout: 1_000 });
    }).toPass({ timeout: 10_000 });
  }

  @step('Check that there are {0} element(s)')
  async checkThatElementCountIs(count: number, type?: Tool, isSoft = false): Promise<void> {
    const elements = type ? this.locators.elementsOfType(type) : this.locators.elements;
    await check(isSoft)(elements).toHaveCount(count);
  }

  @step('Check that element #{0} reads "{1}"')
  async checkThatElementTextIs(index: number, text: string | RegExp, isSoft = false): Promise<void> {
    await check(isSoft)(this.locators.elements.nth(index)).toHaveText(text);
  }

  @step('Check that page {0} matches the snapshot "{1}"')
  async checkThatPageMatchesSnapshot(pageNumber: number, name: string): Promise<void> {
    await expect(this.locators.pageByNumber(pageNumber)).toHaveScreenshot(name, {
      // The page label is decoration that changes with rearranging; keep it out of the diff.
      mask: [this.locators.pageByNumber(pageNumber).locator('.page__label')],
      maxDiffPixels: 2,
      animations: 'disabled',
    });
  }

  @step('Check that page {1} contains {0} element(s)')
  async checkThatPageElementCountIs(count: number, pageNumber: number): Promise<void> {
    await expect(this.locators.pageByNumber(pageNumber).getByTestId('documentElement')).toHaveCount(count);
  }
}
