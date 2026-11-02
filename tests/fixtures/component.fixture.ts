import { test as base, expect } from '@playwright/test';
import type { ShareWidgetConfig } from '@contracts/share-widget.contract';
import { installHostServices } from '@mocks/share-widget/host-services';
import { MockDrift } from '@mocks/share-widget/mock-drift';
import { NetworkGuard } from '@mocks/share-widget/network-guard';
import { RealtimeMock } from '@mocks/share-widget/realtime.mock';
import { ShareApiMocks } from '@mocks/share-widget/share-api.mocks';
import { TEST_CONFIG } from '@mocks/share-widget/test-config';
import { ShareWidget } from '@ui/components/share-widget/ShareWidget';

type ComponentFixtures = {
  widgetConfig: ShareWidgetConfig;
  networkGuard: NetworkGuard;
  mockDrift: MockDrift;
  failOnPageErrors: void;
  hostServices: void;
  injectConfig: void;
  shareApi: ShareApiMocks;
  realtime: RealtimeMock;
  shareWidget: ShareWidget;
};

/**
 * Component isolation harness: the widget runs alone on a harness page, with a typed config,
 * every backend call mocked, host services faked and the network denied by default.
 * Auto fixtures run in declaration order, so the guard is in place before anything loads.
 */
export const test = base.extend<ComponentFixtures>({
  widgetConfig: [TEST_CONFIG, { option: true }],

  networkGuard: [
    async ({ context }, use) => {
      const guard = new NetworkGuard();
      await guard.install(context);
      await use(guard);
      expect(guard.escaped, 'Requests escaped the mocks — add a mock for each of them').toEqual([]);
    },
    { auto: true },
  ],

  mockDrift: [
    async ({}, use) => {
      const drift = new MockDrift();
      await use(drift);
      expect(drift.issues, 'Requests did not match what the mocks expect').toEqual([]);
    },
    { auto: true },
  ],

  failOnPageErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await use();
      expect(errors, 'Uncaught errors in the page').toEqual([]);
    },
    { auto: true },
  ],

  hostServices: [
    async ({ page }, use) => {
      await installHostServices(page);
      await use();
    },
    { auto: true },
  ],

  injectConfig: [
    async ({ page, widgetConfig }, use) => {
      await page.addInitScript((config) => {
        (window as unknown as Record<string, unknown>).__SHARE_WIDGET_CONFIG__ = config;
      }, widgetConfig);
      await use();
    },
    { auto: true },
  ],

  shareApi: [
    async ({ page, mockDrift }, use) => {
      const mocks = new ShareApiMocks(page, mockDrift);
      await mocks.setUp();
      await use(mocks);
    },
    { auto: true },
  ],

  realtime: [
    async ({ page }, use) => {
      const realtime = new RealtimeMock(page);
      await realtime.setUp();
      await use(realtime);
    },
    { auto: true },
  ],

  shareWidget: async ({ page }, use) => {
    await use(new ShareWidget(page));
  },
});
