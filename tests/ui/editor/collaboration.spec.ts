import { test } from '@fixtures/ui.fixture';
import { CONNECTION_STATE, FEATURES, TOOLS } from '@utils/constants';
import { meta } from '@utils/meta';
import { WsClient } from '@ws/ws-client';

test.describe('Collaboration', meta().feature(FEATURES.collaboration).build(), () => {
  test('edits made on one device appear on the other', meta().testId('UI-COLLAB-001').severity('critical').build(), async ({ pages, steps, openSession }) => {
    const document = await steps.createDocument('Shared');
    await pages.editor.open(document.id);
    const tablet = await openSession();
    await tablet.pages.editor.open(document.id);

    await pages.editor.addElement(TOOLS.stamp);

    await test.step('Second device', async () => {
      await tablet.pages.editor.documentArea.checkThatElementCountIs(1, TOOLS.stamp);
      await tablet.pages.editor.documentArea.selectElement(0);
      await tablet.pages.editor.documentArea.deleteSelectedWithKeyboard();
      await tablet.pages.editor.documentArea.checkThatElementCountIs(0);
    });

    await pages.editor.documentArea.checkThatElementCountIs(0);
  });

  test('the editor reconnects and catches up with edits made meanwhile', meta().testId('UI-COLLAB-002').severity('critical').build(), async ({ pages, steps, api, user, baseURL }) => {
    const document = await steps.createDocument('Unstable network');
    await pages.editor.open(document.id);

    await api.documents.dropConnections(document.id);
    await pages.editor.header.checkThatConnectionIs(CONNECTION_STATE.reconnecting);
    const otherDevice = await WsClient.connect(baseURL!, document.id, user.token);
    await otherDevice.sendAndConfirm({
      group: 'elements',
      type: 'add',
      properties: { element: { id: crypto.randomUUID(), type: 'text', page: 1, x: 40, y: 40, content: 'Added meanwhile' } },
    });
    await otherDevice.close();

    await pages.editor.header.checkThatConnectionIs(CONNECTION_STATE.connected);
    await pages.editor.documentArea.checkThatElementTextIs(0, 'Added meanwhile');
  });
});
