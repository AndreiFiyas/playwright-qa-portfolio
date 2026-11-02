import { fetchJson } from '@api/client/api-client';
import { VersionListSchema, type Version } from '@api/models/document.schema';
import { test } from '@fixtures/api.fixture';
import { FEATURES } from '@utils/constants';
import { expectWithStep, objectContaining } from '@utils/expect-with-step';
import { meta } from '@utils/meta';
import { isOperation, type Operation } from '@ws/operations';
import { WsClient } from '@ws/ws-client';

/**
 * Protocol-level tests: two Node clients talk to the editor's WebSocket directly.
 * No browser, so they run in milliseconds and pin down the contract the UI relies on.
 */
const textElement = (page = 1) => ({ id: crypto.randomUUID(), type: 'text', page, x: 10, y: 10, content: 'Hi' });

test.describe('Collaboration protocol', meta().feature(FEATURES.collaboration).build(), () => {
  test('an edit is broadcast to peers and acknowledged to the author only', meta().testId('WS-001').severity('critical').build(), async ({ steps, user, baseURL }) => {
    const document = await steps.createDocument();
    const author = await WsClient.connect(baseURL!, document.id, user.token);
    const peer = await WsClient.connect(baseURL!, document.id, user.token);
    const authorTraffic = author.record();

    // Arm the collector before the trigger: the broadcast may arrive before the ack.
    const broadcast = peer.waitFor('elementAdd');
    const seq = await author.sendAndConfirm({ group: 'elements', type: 'add', properties: { element: textElement() } });

    await expectWithStep((await broadcast).seq, 'seq seen by the peer').toBe(seq);
    const echoed = authorTraffic.stop().filter((op) => isOperation(op, 'elementAdd'));
    await expectWithStep(echoed, 'operations echoed back to the author').toEqual([]);

    await Promise.all([author.close(), peer.close()]);
  });

  test('a saved version is pushed to every editor with the element count', meta().testId('WS-002').build(), async ({ steps, api, user, baseURL }) => {
    const document = await steps.createDocument();
    const first = await WsClient.connect(baseURL!, document.id, user.token);
    const second = await WsClient.connect(baseURL!, document.id, user.token);
    await first.sendAndConfirm({ group: 'elements', type: 'add', properties: { element: textElement() } });

    const [toFirst, toSecond] = [first.waitFor('versionsList'), second.waitFor('versionsList')];
    first.send({ group: 'versions', type: 'save' });
    const lists = (await Promise.all([toFirst, toSecond])).map((op) => op.properties?.versions as Version[]);

    await expectWithStep(lists[0], 'list sent to the author').toEqual([objectContaining({ label: 'Version 1', elementCount: 1 })]);
    await expectWithStep(lists[1], 'list sent to the peer').toEqual(lists[0]);
    const rest = await fetchJson(api.documents.versions(document.id), VersionListSchema);
    await expectWithStep(rest.items, 'REST view of the same versions').toEqual(lists[0]);

    await Promise.all([first.close(), second.close()]);
  });

  test('a reconnecting client resumes with only the operations it missed', meta().testId('WS-003').severity('critical').build(), async ({ steps, user, baseURL }) => {
    const document = await steps.createDocument();
    const online = await WsClient.connect(baseURL!, document.id, user.token);
    const flaky = await WsClient.connect(baseURL!, document.id, user.token);
    const lastSeq = await online.sendAndConfirm({ group: 'elements', type: 'add', properties: { element: textElement(1) } });
    await flaky.close();

    await online.sendAndConfirm({ group: 'elements', type: 'add', properties: { element: textElement(2) } });
    await online.sendAndConfirm({ group: 'elements', type: 'add', properties: { element: textElement(3) } });

    const resumed = await WsClient.connect(baseURL!, document.id, user.token, { init: false });
    const replay = resumed.collect((ops) => ops.some((op) => isOperation(op, 'versionsList')));
    resumed.send({ group: 'session', type: 'resume', properties: { lastSeq } });
    const ops: Operation[] = await replay;

    await expectWithStep(ops.find((op) => isOperation(op, 'sessionResumed'))?.properties, 'resume summary').toEqual({ seq: lastSeq + 2, replayed: 2 });
    const replayedPages = ops.filter((op) => isOperation(op, 'elementAdd')).map((op) => (op.properties?.element as { page: number }).page);
    await expectWithStep(replayedPages, 'pages of the replayed elements').toEqual([2, 3]);

    await Promise.all([online.close(), resumed.close()]);
  });

  test('a socket with a foreign token is refused', meta().testId('WS-004').build(), async ({ steps, baseURL }) => {
    const document = await steps.createDocument();

    const code = await WsClient.connectRejected(baseURL!, document.id, crypto.randomUUID());

    await expectWithStep(code, 'close code').toBe(4401);
  });
});
