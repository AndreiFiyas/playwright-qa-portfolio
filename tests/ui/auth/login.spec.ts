import { test } from '@fixtures/ui.fixture';
import { FEATURES } from '@utils/constants';
import { meta } from '@utils/meta';

test.describe('Login', meta().feature(FEATURES.auth).build(), () => {
  // The only tests that sign in through the UI; everything else gets an injected session.
  test.use({ signedIn: false });

  test('a user signs in and lands on the dashboard', meta().testId('UI-AUTH-001').severity('blocker').build(), async ({ pages, steps, user }) => {
    await steps.createDocument('Welcome pack');

    await pages.login.open();
    await pages.login.signIn(user.email, user.password);

    await pages.dashboard.isOpened();
    await pages.dashboard.checkThatDocumentIsListed('Welcome pack');
  });

  test('a wrong password keeps the user on the login page', meta().testId('UI-AUTH-002').build(), async ({ pages, user }) => {
    await pages.login.open();
    await pages.login.signIn(user.email, 'definitely-wrong');

    await pages.login.checkThatErrorIsShown();
  });
});
