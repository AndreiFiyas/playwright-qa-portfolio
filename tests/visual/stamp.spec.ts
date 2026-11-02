import { test } from '@fixtures/ui.fixture';
import { FEATURES, TOOLS } from '@utils/constants';
import { meta } from '@utils/meta';
import { skipOnPlatform } from '@utils/skip';

test.describe('Visual: stamp', meta().feature(FEATURES.editorTools).build(), () => {
  // The stamp prints today's date, which used to break the baseline every day.
  // Freezing the browser clock makes the render deterministic.
  test(
    'a stamp renders with the frozen date',
    meta().testId('VIS-001').annotate(skipOnPlatform(['darwin', 'win32'], 'baselines are rendered on Linux in CI')).build(),
    async ({ pages, steps, browserMocks }) => {
      const document = await steps.createDocument('Approval');
      await browserMocks.freezeTime('2026-01-15T10:00:00Z');
      await pages.editor.open(document.id);

      await pages.editor.addElement(TOOLS.stamp, 1, { x: 200, y: 300 });

      await pages.editor.documentArea.checkThatElementTextIs(0, 'APPROVED · Jan 15, 2026');
      await pages.editor.documentArea.checkThatPageMatchesSnapshot(1, 'page-with-stamp.png');
    },
  );
});
