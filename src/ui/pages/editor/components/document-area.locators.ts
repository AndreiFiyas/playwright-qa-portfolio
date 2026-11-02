import type { Page } from '@playwright/test';

/** Locators live apart from behaviour, so a markup change touches one small file. */
export const documentAreaLocators = (page: Page) => {
  const root = page.getByTestId('documentArea');
  return {
    root,
    pages: root.getByTestId('page'),
    pageByNumber: (pageNumber: number) => root.locator(`[data-qa="page"][data-page-number="${pageNumber}"]`),
    elements: root.getByTestId('documentElement'),
    elementsOfType: (type: string) => root.locator(`[data-qa="documentElement"][data-type="${type}"]`),
  };
};
