import { test } from '@fixtures/ui.fixture';
import { FEATURES, TOOLS } from '@utils/constants';
import { meta } from '@utils/meta';

test.describe('Versions', meta().feature(FEATURES.versions).build(), () => {
  test('each saved version remembers the document state', meta().testId('UI-VER-001').severity('critical').build(), async ({ pages, steps }) => {
    const document = await steps.createDocument('Versioned');
    await pages.editor.open(document.id);

    await pages.editor.addElement(TOOLS.text);
    await pages.editor.versions.saveVersion();
    await pages.editor.addElement(TOOLS.checkmark, 2);
    const versions = await pages.editor.versions.saveVersion();

    // Assert the server's answer, then the table rendered from it.
    await pages.editor.versions.checkServerVersionsList(versions, [2, 1]);
    await pages.editor.versions.checkThatRowCountIs(2);
  });

  test('after a reconnect the versions list is re-sent by the server', meta().testId('UI-VER-002').build(), async ({ pages, steps, api }) => {
    const document = await steps.createDocument('Reconnect versions');
    await pages.editor.open(document.id);
    await pages.editor.addElement(TOOLS.stamp);
    await pages.editor.versions.saveVersion();

    const versions = await pages.editor.versions.readServerListDuring(() => api.documents.dropConnections(document.id));

    await pages.editor.versions.checkServerVersionsList(versions, [1]);
    await pages.editor.versions.checkThatRowCountIs(1);
  });
});
