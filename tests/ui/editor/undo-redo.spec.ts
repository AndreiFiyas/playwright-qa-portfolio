import { test } from '@fixtures/ui.fixture';
import { FEATURES, TOOLS } from '@utils/constants';
import { meta } from '@utils/meta';

test.describe('Undo / redo', meta().feature(FEATURES.undoRedo).build(), () => {
  // History is committed after a debounce. The page object waits for Undo to become
  // enabled — the app's own signal — so this test needs no sleeps and does not flake.
  test('undo removes the last element and redo brings it back', meta().testId('UI-UNDO-001').severity('critical').build(), async ({ pages, steps }) => {
    const document = await steps.createDocument('History');
    await pages.editor.open(document.id);
    await pages.editor.toolbar.checkThatUndoIsEnabled(false);

    await pages.editor.addElement(TOOLS.text);
    await pages.editor.toolbar.clickOnUndo();
    await pages.editor.documentArea.checkThatElementCountIs(0);

    await pages.editor.toolbar.clickOnRedo();
    await pages.editor.documentArea.checkThatElementCountIs(1, TOOLS.text);
  });

  test('undo is synced to the server', meta().testId('UI-UNDO-002').build(), async ({ pages, steps }) => {
    const document = await steps.createDocument('Synced undo');
    await pages.editor.open(document.id);
    await pages.editor.addElement(TOOLS.stamp);
    await pages.editor.toolbar.clickOnUndo();
    await pages.editor.documentArea.checkThatElementCountIs(0);

    await pages.editor.reload();

    await pages.editor.documentArea.checkThatElementCountIs(0);
  });
});
