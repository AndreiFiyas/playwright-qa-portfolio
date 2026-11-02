import { expect } from '@playwright/test';

/**
 * Page-object checks take `isSoft = false` as their last parameter. A soft check records
 * the failure and lets the test continue, which is useful when one test verifies several
 * independent properties of the same screen.
 */
export const check = (isSoft: boolean) => (isSoft ? expect.soft : expect);
