import { test } from '@fixtures/ui.fixture';
import { FEATURES } from '@utils/constants';
import { meta } from '@utils/meta';

test.describe('Rearrange pages', meta().feature(FEATURES.rearrange).build(), () => {
  test('moving a page changes the order in the document and on the server', meta().testId('UI-REAR-001').severity('critical').build(), async ({ pages, steps }) => {
    const document = await steps.createDocument('Contract', 4);
    await pages.editor.open(document.id);

    await pages.editor.thumbnails.movePageUp(3);
    await pages.editor.thumbnails.movePageDown(1);
    await pages.editor.thumbnails.checkThatPageOrderIs([3, 1, 2, 4]);

    await pages.editor.reload();

    await pages.editor.thumbnails.checkThatPageOrderIs([3, 1, 2, 4]);
  });

  test('elements move together with their page', meta().testId('UI-REAR-002').build(), async ({ pages, steps }) => {
    const document = await steps.createDocumentWithElements('Signed pages', [
      { type: 'stamp', page: 2, x: 50, y: 50, content: 'APPROVED' },
    ]);
    await pages.editor.open(document.id);

    await pages.editor.thumbnails.movePageUp(2);

    await pages.editor.thumbnails.checkThatPageOrderIs([2, 1, 3]);
    await pages.editor.documentArea.checkThatPageElementCountIs(1, 2);
  });
});
