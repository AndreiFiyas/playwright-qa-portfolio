import { test } from '@fixtures/ui.fixture';
import { FEATURES } from '@utils/constants';
import { meta } from '@utils/meta';

test.describe('Page navigation', meta().feature(FEATURES.navigation).build(), () => {
  // The editor applies "fit width" after the first paint and resets scroll when it does.
  // scrollToPage() retries the whole intent (scroll + in-viewport check) until it sticks.
  test('scrolling to a page makes its thumbnail active', meta().testId('UI-NAV-001').build(), async ({ pages, steps }) => {
    const document = await steps.createDocument('Long document', 6);
    await pages.editor.open(document.id);

    await pages.editor.documentArea.scrollToPage(5);

    await pages.editor.thumbnails.checkThatActivePageIs(5);
  });
});
