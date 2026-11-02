import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { ZodType } from 'zod';
import { ZodError } from 'zod';

type RequestOptions = {
  data?: unknown;
  params?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
};

/**
 * Thin HTTP client over Playwright's APIRequestContext.
 *
 * - Every verb returns the raw APIResponse, so tests can assert on status codes,
 *   including negative cases, without try/catch.
 * - An optional Zod schema validates the body; a mismatch fails with a readable
 *   list of paths instead of a stack trace from deep inside the test.
 */
export class ApiClient {
  constructor(
    private readonly request: APIRequestContext,
    private token?: string,
  ) {}

  withToken(token: string): ApiClient {
    return new ApiClient(this.request, token);
  }

  get(url: string, schema?: ZodType, options: RequestOptions = {}) {
    return this.send('GET', url, schema, options);
  }

  post(url: string, schema?: ZodType, options: RequestOptions = {}) {
    return this.send('POST', url, schema, options);
  }

  patch(url: string, schema?: ZodType, options: RequestOptions = {}) {
    return this.send('PATCH', url, schema, options);
  }

  delete(url: string, options: RequestOptions = {}) {
    return this.send('DELETE', url, undefined, options);
  }

  private async send(method: string, url: string, schema: ZodType | undefined, options: RequestOptions) {
    const response = await this.request.fetch(url, {
      method,
      data: options.data,
      params: options.params,
      headers: { ...(this.token ? { authorization: `Bearer ${this.token}` } : {}), ...options.headers },
    });
    if (schema && response.ok()) await this.validate(response, schema, `${method} ${url}`);
    return response;
  }

  private async validate(response: APIResponse, schema: ZodType, label: string): Promise<void> {
    try {
      schema.parse(await response.json());
    } catch (error) {
      if (!(error instanceof ZodError)) throw error;
      const issues = error.issues.map((issue) => `  - ${issue.path.join('.') || '<root>'}: ${issue.message}`);
      throw new Error(`Response of ${label} does not match its schema:\n${issues.join('\n')}`);
    }
  }
}

/** Parses a response body with the schema's static type. */
export async function fetchJson<T>(responsePromise: Promise<APIResponse>, schema: ZodType<T>): Promise<T> {
  const response = await responsePromise;
  if (!response.ok()) {
    throw new Error(`${response.url()} answered ${response.status()}: ${await response.text()}`);
  }
  return schema.parse(await response.json());
}
