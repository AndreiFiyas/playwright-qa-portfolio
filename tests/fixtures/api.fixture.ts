import { AppApi } from '@api/app-api';
import { fetchJson } from '@api/client/api-client';
import { ComplexSteps } from '@api/complex-steps';
import { LoginResponseSchema, TestUserSchema, type Plan, type TestUser } from '@api/models/user.schema';
import { test as base } from './base.fixture';

export type SessionUser = TestUser & { token: string };

type ApiFixtures = {
  /** Plan of the disposable user. Override per file/describe: `test.use({ plan: 'free' })`. */
  plan: Plan;
  /** A fresh user per test — tests never share accounts or documents. */
  user: SessionUser;
  anonymousApi: AppApi;
  api: AppApi;
  steps: ComplexSteps;
  /** Factory for extra users, e.g. to check access between accounts. */
  createUserApi: (plan?: Plan) => Promise<AppApi>;
};

const createSessionUser = async (anonymousApi: AppApi, plan: Plan): Promise<SessionUser> => {
  const user = await fetchJson(anonymousApi.users.createTestUser(plan), TestUserSchema);
  const { token } = await fetchJson(anonymousApi.users.login(user.email, user.password), LoginResponseSchema);
  return { ...user, token };
};

/** Layer 2: API access and disposable users. */
export const test = base.extend<ApiFixtures>({
  plan: ['paid', { option: true }],

  anonymousApi: async ({ request }, use) => {
    await use(new AppApi(request));
  },

  user: async ({ anonymousApi, plan }, use) => {
    await use(await createSessionUser(anonymousApi, plan));
  },

  createUserApi: async ({ anonymousApi, request }, use) => {
    await use(async (plan = 'paid') => new AppApi(request, (await createSessionUser(anonymousApi, plan)).token));
  },

  api: async ({ request, user }, use) => {
    await use(new AppApi(request, user.token));
  },

  steps: async ({ api, user, baseURL }, use) => {
    await use(new ComplexSteps(api, { baseURL: baseURL!, token: user.token }));
  },
});

export { expect } from '@playwright/test';
