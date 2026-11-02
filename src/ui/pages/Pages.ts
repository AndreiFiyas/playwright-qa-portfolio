import type { Page } from '@playwright/test';
import { Toast } from '@ui/components/Toast';
import type { WsMonitor } from '@ui/utils/ws-monitor';
import { DashboardPage } from './dashboard/DashboardPage';
import { EditorPage } from './editor/EditorPage';
import { LoginPage } from './login/LoginPage';

/** One entry point per browser session; tests receive it as the `pages` fixture. */
export class Pages {
  readonly login: LoginPage;
  readonly dashboard: DashboardPage;
  readonly editor: EditorPage;
  readonly toast: Toast;

  constructor(page: Page, ws: WsMonitor) {
    this.login = new LoginPage(page);
    this.dashboard = new DashboardPage(page);
    this.editor = new EditorPage(page, ws);
    this.toast = new Toast(page);
  }
}
