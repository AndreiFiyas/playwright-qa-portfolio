import { test } from '@fixtures/ui.fixture';
import { FEATURES } from '@utils/constants';
import { meta } from '@utils/meta';

test.describe('Print', meta().feature(FEATURES.export).build(), () => {
  test('print waits for the export job, then opens the print dialog', meta().testId('UI-PRINT-001').build(), async ({ pages, steps, browserMocks }) => {
    const document = await steps.createDocument('Boarding pass');
    await browserMocks.stubPrint();
    await pages.editor.open(document.id);

    await pages.editor.header.clickOnPrint();

    await pages.toast.checkThatMessageIs('Ready to print');
    await browserMocks.checkThatPrintWasRequested(1);
  });
});
