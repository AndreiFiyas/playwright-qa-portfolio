import type { Page, Route } from '@playwright/test';
import type { Permission, ShareRequest, ShareSettingsResponse } from '@contracts/share-widget.contract';
import type { MockDrift } from './mock-drift';
import { SHARE_LINK, SHARE_SETTINGS } from './responses';
import { TEST_CONFIG } from './test-config';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
};

type ShareOutcome = { status: number; body?: unknown };

/**
 * REST mocks for the share widget. `setUp()` installs the happy state; a test overrides one
 * endpoint by calling a more specific method afterwards (later routes win).
 */
export class ShareApiMocks {
  readonly shareRequests: ShareRequest[] = [];
  private readonly base = TEST_CONFIG.api.baseUrl;

  constructor(
    private readonly page: Page,
    private readonly drift: MockDrift,
  ) {}

  async setUp(): Promise<void> {
    await this.page.route(`${this.base}/**`, (route) =>
      route.request().method() === 'OPTIONS' ? route.fulfill({ status: 204, headers: CORS }) : route.fallback(),
    );
    await this.shareSettings(SHARE_SETTINGS);
    await this.shareAnswers({ status: 200, body: { link: SHARE_LINK, permission: 'view' } });
  }

  async shareSettings(settings: ShareSettingsResponse): Promise<void> {
    await this.page.route(`${this.base}/documents/*/share-settings`, (route) => {
      if (!route.request().url().includes(`/documents/${TEST_CONFIG.documentId}/`)) {
        return this.drifted(route, `share-settings requested for an unexpected document: ${route.request().url()}`);
      }
      return route.fulfill({ status: 200, headers: CORS, json: settings });
    });
  }

  async shareAnswers(outcome: ShareOutcome): Promise<void> {
    await this.page.route(`${this.base}/share`, (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      const body = route.request().postDataJSON() as ShareRequest;
      const problem = this.validateShareRequest(body);
      if (problem) return this.drifted(route, problem);
      this.shareRequests.push(body);
      const permission = body.permission;
      const json = outcome.status === 200 ? { link: SHARE_LINK, permission } : (outcome.body ?? { error: 'ERROR' });
      return route.fulfill({ status: outcome.status, headers: CORS, json });
    });
  }

  private validateShareRequest(body: Partial<ShareRequest> | null): string | undefined {
    const permissions: Permission[] = ['view', 'comment', 'edit'];
    if (body?.documentId !== TEST_CONFIG.documentId) return `POST /share: documentId ${body?.documentId} is not the configured one`;
    if (!body.permission || !permissions.includes(body.permission)) return `POST /share: unknown permission "${body.permission}"`;
    return undefined;
  }

  private drifted(route: Route, issue: string) {
    this.drift.record(issue);
    return route.fulfill({ status: 500, headers: CORS, json: { error: 'MOCK_DRIFT', issue } });
  }
}
