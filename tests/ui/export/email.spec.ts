import { test } from '@fixtures/ui.fixture';
import { FEATURES } from '@utils/constants';
import { meta } from '@utils/meta';

test.describe('Export by email', meta().feature(FEATURES.export).build(), () => {
  test('the document is sent and the user is told when it is done', meta().testId('UI-EMAIL-001').severity('critical').build(), async ({ pages, modals, steps }) => {
    const document = await steps.createDocument('Offer letter');
    await pages.editor.open(document.id);

    await pages.editor.header.clickOnEmail();
    await modals.email.isOpened();
    await modals.email.checkThatSubjectIs('Offer letter');
    await modals.email.send('hr@example.test');

    await modals.email.checkThatIsClosed();
    await pages.toast.checkThatMessageIs('Email sent');
  });

  test('an invalid recipient is reported in the modal', meta().testId('UI-EMAIL-002').build(), async ({ pages, modals, steps }) => {
    const document = await steps.createDocument('Offer letter');
    await pages.editor.open(document.id);

    await pages.editor.header.clickOnEmail();
    await modals.email.send('hr@');

    await modals.email.checkThatErrorIs('Enter a valid email address');
  });

  test('an unexpected backend failure shows a generic error', meta().testId('UI-EMAIL-003').build(), async ({ pages, modals, steps, browserMocks }) => {
    const document = await steps.createDocument('Offer letter');
    await browserMocks.failRequests('**/api/export/email', 503);
    await pages.editor.open(document.id);

    await pages.editor.header.clickOnEmail();
    await modals.email.send('hr@example.test');

    await modals.email.checkThatErrorIs('Something went wrong');
  });

  test.describe('free plan', () => {
    test.use({ plan: 'free' });

    test('the user is asked to upgrade', meta().testId('UI-EMAIL-004').build(), async ({ pages, modals, steps }) => {
      const document = await steps.createDocument('Offer letter');
      await pages.editor.open(document.id);

      await pages.editor.header.clickOnEmail();
      await modals.email.send('hr@example.test');

      await modals.email.checkThatErrorIs('Upgrade to send documents');
    });
  });
});
