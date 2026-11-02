import type { Page } from '@playwright/test';
import { BasePage } from '@ui/base/BasePage';
import type { WsMonitor } from '@ui/utils/ws-monitor';
import { CONNECTION_STATE, type Tool } from '@utils/constants';
import { step } from '@utils/step';
import { DocumentArea, type Point } from './components/DocumentArea';
import { EditorHeader } from './components/EditorHeader';
import { SelectedActionsBar } from './components/SelectedActionsBar';
import { ThumbnailsPanel } from './components/ThumbnailsPanel';
import { Toolbar } from './components/Toolbar';
import { VersionsPanel } from './components/VersionsPanel';

/** Composite page object: the editor is a set of independent, reusable components. */
export class EditorPage extends BasePage {
  readonly header: EditorHeader;
  readonly toolbar: Toolbar;
  readonly documentArea: DocumentArea;
  readonly thumbnails: ThumbnailsPanel;
  readonly versions: VersionsPanel;
  readonly selectedActions: SelectedActionsBar;

  constructor(page: Page, ws: WsMonitor) {
    super(page);
    this.header = new EditorHeader(page);
    this.toolbar = new Toolbar(page);
    this.documentArea = new DocumentArea(page);
    this.thumbnails = new ThumbnailsPanel(page);
    this.versions = new VersionsPanel(page, ws);
    this.selectedActions = new SelectedActionsBar(page);
  }

  @step('Open document {0} in the editor')
  async open(documentId: number): Promise<void> {
    await this.page.goto(`/editor/${documentId}`);
    await this.isOpened();
  }

  @step('Check that the editor is opened and ready')
  async isOpened(): Promise<void> {
    await this.header.checkThatConnectionIs(CONNECTION_STATE.connected);
    await this.documentArea.waitForLayout();
  }

  @step('Reload the editor')
  async reload(): Promise<void> {
    await this.page.reload();
    await this.isOpened();
  }

  /** The most common user intent, expressed once: pick a tool and place it. */
  @step('Add a {0} element on page {1}')
  async addElement(tool: Tool, pageNumber = 1, position?: Point): Promise<void> {
    await this.toolbar.selectTool(tool);
    await this.documentArea.clickOnPage(pageNumber, position);
  }
}
