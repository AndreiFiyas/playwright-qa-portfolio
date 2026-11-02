import { test } from '@fixtures/ui.fixture';
import { FEATURES, TOOLS } from '@utils/constants';
import { meta } from '@utils/meta';

test.describe('Mobile toolbar', meta().feature(FEATURES.editorTools).build(), () => {
  test('tools live in a collapsible menu and still place elements', meta().testId('UI-MOB-001').build(), async ({ pages, steps }) => {
    const document = await steps.createDocument('On the go');
    await pages.editor.open(document.id);
    await pages.editor.toolbar.checkThatToolsMenuIsCollapsed();

    await pages.editor.addElement(TOOLS.checkmark);

    await pages.editor.documentArea.checkThatElementCountIs(1, TOOLS.checkmark);
    await pages.editor.toolbar.checkThatToolsMenuIsCollapsed();
  });
});
