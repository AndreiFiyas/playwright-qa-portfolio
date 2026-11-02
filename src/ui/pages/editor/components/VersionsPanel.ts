import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import type { Version } from '@api/models/document.schema';
import { Component } from '@ui/base/Component';
import type { WsMonitor } from '@ui/utils/ws-monitor';
import { step } from '@utils/step';

type VersionsList = { versions: Version[] };

export class VersionsPanel extends Component {
  private readonly saveButton = this.page.getByTestId('saveVersionButton');
  private readonly rows = this.page.getByTestId('versionsTable').getByTestId('versionRow');

  constructor(
    page: Page,
    private readonly ws: WsMonitor,
  ) {
    super(page);
  }

  /** Saves a version and returns the list the server broadcast in reply. */
  @step('Save a version')
  async saveVersion(): Promise<Version[]> {
    const { versions } = await this.ws.waitForOperation<VersionsList>('versionsList', () => this.saveButton.click());
    return versions;
  }

  /** Returns the versions list the server sends while `action` runs (e.g. on reconnect). */
  @step('Read the server versions list')
  async readServerListDuring(action: () => Promise<unknown>): Promise<Version[]> {
    const { versions } = await this.ws.waitForOperation<VersionsList>('versionsList', async () => {
      await action();
    });
    return versions;
  }

  @step('Check that the versions table shows {0} row(s)')
  async checkThatRowCountIs(count: number): Promise<void> {
    await expect(this.rows).toHaveCount(count);
  }

  /**
   * Checks the server's view of the versions, not the DOM: newest first, labelled in
   * order, each one remembering how many elements the document had when it was saved.
   */
  @step('Check the server versions list: {1}')
  async checkServerVersionsList(versions: Version[], expectedElementCounts: number[]): Promise<void> {
    expect(versions.map((v) => v.elementCount), 'element count per version (newest first)').toEqual(
      expectedElementCounts,
    );
    expect(versions.map((v) => v.label)).toEqual(versions.map((_, i) => `Version ${versions.length - i}`));
  }
}
