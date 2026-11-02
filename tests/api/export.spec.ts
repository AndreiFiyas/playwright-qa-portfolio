import { test } from '@fixtures/api.fixture';
import { EXPORT_STATUS, FEATURES } from '@utils/constants';
import { expectWithStep } from '@utils/expect-with-step';
import { meta } from '@utils/meta';

test.describe('Export API', meta().feature(FEATURES.export).build(), () => {
  test('an email export job reaches COMPLETED', meta().testId('API-EXP-001').severity('critical').build(), async ({ steps }) => {
    const document = await steps.createDocument('Invoice');

    const job = await steps.exportByEmailAndWait(document.id, 'recipient@example.test');

    await expectWithStep(job, 'final job').toEqual({ jobId: job.jobId, channel: 'email', status: EXPORT_STATUS.completed });
  });

  test('an invalid recipient is rejected before a job is created', meta().testId('API-EXP-002').build(), async ({ api, steps }) => {
    const document = await steps.createDocument('Invoice');

    const response = await api.export.email(document.id, 'not-an-email');

    await expectWithStep(response.status(), 'status').toBe(422);
  });

  test.describe('free plan', () => {
    test.use({ plan: 'free' });

    test('export requires an upgrade', meta().testId('API-EXP-003').build(), async ({ api, steps }) => {
      const document = await steps.createDocument('Invoice');

      const response = await api.export.print(document.id);

      await expectWithStep(response.status(), 'status').toBe(402);
    });
  });
});
