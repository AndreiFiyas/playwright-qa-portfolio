import type { ApiClient } from '@api/client/api-client';
import { LoginResponseSchema, TestUserSchema, type Plan } from '@api/models/user.schema';

/** Services are thin: one method per endpoint, raw APIResponse out, no parsing or assertions. */
export class UsersService {
  constructor(private readonly client: ApiClient) {}

  createTestUser(plan: Plan = 'paid') {
    return this.client.post('/api/users', TestUserSchema, { data: { plan } });
  }

  login(email: string, password: string) {
    return this.client.post('/api/auth/login', LoginResponseSchema, { data: { email, password } });
  }
}
