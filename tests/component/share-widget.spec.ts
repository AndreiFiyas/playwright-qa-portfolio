import { test } from '@fixtures/component.fixture';
import { SHARE_LINK, SHARE_SETTINGS } from '@mocks/share-widget/responses';
import { TEST_CONFIG } from '@mocks/share-widget/test-config';
import { FEATURES } from '@utils/constants';
import { expectWithStep } from '@utils/expect-with-step';
import { meta } from '@utils/meta';

test.describe('Share widget (isolated)', meta().feature(FEATURES.share).build(), () => {
  test('renders the share settings from its backend', meta().testId('CMP-SHARE-001').build(), async ({ shareWidget }) => {
    await shareWidget.open();

    await shareWidget.checkThatTitleIs(`Share “${SHARE_SETTINGS.name}”`);
    await shareWidget.checkThatPermissionsAre(['view', 'comment', 'edit']);
    await shareWidget.checkThatRecipientStatusIs('teammate@example.test', 'Accepted');
  });

  test('sharing sends the chosen permission and shows the link', meta().testId('CMP-SHARE-002').severity('critical').build(), async ({ shareWidget, shareApi }) => {
    await shareWidget.open();

    await shareWidget.shareWith('new.person@example.test', 'edit');

    await shareWidget.checkThatLinkIs(SHARE_LINK);
    await shareWidget.checkThatRecipientStatusIs('new.person@example.test', 'Pending');
    await expectWithStep(shareApi.shareRequests, 'requests received by the mock').toEqual([
      { documentId: TEST_CONFIG.documentId, email: 'new.person@example.test', permission: 'edit' },
    ]);
  });

  // Every backend failure maps to a user-facing message; only unexpected ones are logged.
  const failures = [
    { status: 400, message: 'Enter a valid email address', logged: false },
    { status: 429, message: 'Too many invites. Try again later', logged: false },
    { status: 500, message: 'Something went wrong', logged: true },
  ];
  for (const { status, message, logged } of failures) {
    test(`HTTP ${status} is shown as "${message}"`, meta().testId(`CMP-SHARE-003-${status}`).build(), async ({ shareWidget, shareApi }) => {
      await shareApi.shareAnswers({ status });
      await shareWidget.open();

      await shareWidget.shareWith('someone@example.test');

      await shareWidget.checkThatErrorIs(message);
      if (logged) await shareWidget.checkThatHostWasCalled('logger.error', ['share failed', { status }]);
      else await shareWidget.checkThatHostWasNotCalled();
    });
  }

  test('an invite accepted elsewhere updates the recipient live', meta().testId('CMP-SHARE-004').build(), async ({ shareWidget, realtime }) => {
    await shareWidget.open();
    await shareWidget.shareWith('late.reader@example.test');
    await shareWidget.checkThatRecipientStatusIs('late.reader@example.test', 'Pending');

    await realtime.push({ type: 'invite-accepted', email: 'late.reader@example.test' });

    await shareWidget.checkThatRecipientStatusIs('late.reader@example.test', 'Accepted');
  });

  test('feedback is delegated to the host shell', meta().testId('CMP-SHARE-005').build(), async ({ shareWidget }) => {
    await shareWidget.open();

    await shareWidget.clickOnGiveFeedback();

    await shareWidget.checkThatHostWasCalled('feedback.open', [{ source: 'share-widget' }]);
  });
});
