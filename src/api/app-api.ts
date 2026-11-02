import type { APIRequestContext } from '@playwright/test';
import { ApiClient } from '@api/client/api-client';
import { DocumentsService } from '@api/services/documents.service';
import { ExportService } from '@api/services/export.service';
import { UsersService } from '@api/services/users.service';

/** Facade over every backend service for one (optionally authenticated) caller. */
export class AppApi {
  readonly users: UsersService;
  readonly documents: DocumentsService;
  readonly export: ExportService;

  constructor(request: APIRequestContext, token?: string) {
    const client = new ApiClient(request, token);
    this.users = new UsersService(client);
    this.documents = new DocumentsService(client);
    this.export = new ExportService(client);
  }
}
