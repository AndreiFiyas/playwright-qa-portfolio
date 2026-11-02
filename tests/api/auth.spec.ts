import { fetchJson } from '@api/client/api-client';
import { ErrorSchema, LoginResponseSchema } from '@api/models/user.schema';
import { test } from '@fixtures/api.fixture';
import { FEATURES } from '@utils/constants';
import { expectWithStep } from '@utils/expect-with-step';
import { meta } from '@utils/meta';

test.describe('Auth API', meta().feature(FEATURES.auth).build(), () => {
  test('a registered user gets a session token', meta().testId('API-AUTH-001').severity('blocker').build(), async ({ anonymousApi, user }) => {
    const session = await fetchJson(anonymousApi.users.login(user.email, user.password), LoginResponseSchema);

    await expectWithStep(session.userId, 'user id').toBe(user.id);
    await expectWithStep(session.token, 'token').not.toBe(user.token);
  });

  test('a wrong password is rejected with 401', meta().testId('API-AUTH-002').build(), async ({ anonymousApi, user }) => {
    const response = await anonymousApi.users.login(user.email, `${user.password}-wrong`);

    await expectWithStep(response.status(), 'status').toBe(401);
    await expectWithStep(ErrorSchema.parse(await response.json()), 'body').toEqual({ error: 'INVALID_CREDENTIALS' });
  });

  test('protected endpoints refuse anonymous calls', meta().testId('API-AUTH-003').build(), async ({ anonymousApi }) => {
    const response = await anonymousApi.documents.list();

    await expectWithStep(response.status(), 'status').toBe(401);
  });
});
