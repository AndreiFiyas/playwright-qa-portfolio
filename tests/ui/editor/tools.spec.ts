import { test } from '@fixtures/ui.fixture';
import { FEATURES, TOOLS } from '@utils/constants';
import { meta } from '@utils/meta';

test.describe('Editor tools', meta().feature(FEATURES.editorTools).build(), () => {
  test('each tool places its element on the clicked page', meta().testId('UI-TOOLS-001').severity('critical').build(), async ({ pages, steps }) => {
    const document = await steps.createDocument('Tools');
    await pages.editor.open(document.id);

    await pages.editor.addElement(TOOLS.text, 1);
    await pages.editor.addElement(TOOLS.checkmark, 1, { x: 200, y: 200 });
    await pages.editor.addElement(TOOLS.stamp, 2);

    await pages.editor.documentArea.checkThatPageElementCountIs(2, 1);
    await pages.editor.documentArea.checkThatPageElementCountIs(1, 2);
    await pages.editor.documentArea.checkThatElementCountIs(1, TOOLS.stamp);
  });

  test('placed elements survive a reload', meta().testId('UI-TOOLS-002').build(), async ({ pages, steps }) => {
    const document = await steps.createDocument('Persistence');
    await pages.editor.open(document.id);
    await pages.editor.addElement(TOOLS.text);
    await pages.editor.documentArea.checkThatElementCountIs(1);

    await pages.editor.reload();

    await pages.editor.documentArea.checkThatElementCountIs(1, TOOLS.text);
  });

  test('the selected-element bar duplicates and deletes', meta().testId('UI-TOOLS-003').build(), async ({ pages, steps }) => {
    const document = await steps.createDocumentWithElements('Selection', [
      { type: 'checkmark', page: 1, x: 100, y: 100, content: '✓' },
    ]);
    await pages.editor.open(document.id);

    await pages.editor.documentArea.selectElement(0);
    await pages.editor.selectedActions.checkThatIsVisible();
    await pages.editor.selectedActions.clickOnDuplicate();
    await pages.editor.documentArea.checkThatElementCountIs(2, TOOLS.checkmark);

    await pages.editor.selectedActions.clickOnDelete();

    await pages.editor.documentArea.checkThatElementCountIs(1, TOOLS.checkmark);
    await pages.editor.selectedActions.checkThatIsVisible(false);
  });

  test('the Delete key removes the focused element', meta().testId('UI-TOOLS-004').build(), async ({ pages, steps }) => {
    const document = await steps.createDocumentWithElements('Keyboard', [
      { type: 'text', page: 1, x: 80, y: 80, content: 'Remove me' },
    ]);
    await pages.editor.open(document.id);

    await pages.editor.documentArea.selectElement(0);
    await pages.editor.documentArea.deleteSelectedWithKeyboard();

    await pages.editor.documentArea.checkThatElementCountIs(0);
  });
});
