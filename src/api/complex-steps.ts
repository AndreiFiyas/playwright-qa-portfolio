import { fetchJson } from '@api/client/api-client';
import type { AppApi } from '@api/app-api';
import { DocumentSchema, type Document, type DocumentElement } from '@api/models/document.schema';
import { ExportJobCreatedSchema, ExportJobSchema, type ExportJob } from '@api/models/export.schema';
import { EXPORT_STATUS } from '@utils/constants';
import { waitFor } from '@utils/poll';
import { step } from '@utils/step';
import { WsClient } from '@ws/ws-client';

/**
 * Multi-call setup flows. They prepare state and return ids; they never assert —
 * a failure here means "could not set up", not "the feature is broken".
 */
export class ComplexSteps {
  constructor(
    private readonly api: AppApi,
    private readonly session: { baseURL: string; token: string },
  ) {}

  @step('Create document "{0}" with {1} pages')
  async createDocument(name = `Doc ${Date.now()}`, pages = 3): Promise<Document> {
    return fetchJson(this.api.documents.create({ name, pages }), DocumentSchema);
  }

  /** Seeds elements through the same WebSocket protocol the editor uses. */
  @step('Create document with {1} element(s)')
  async createDocumentWithElements(
    name: string,
    elements: Omit<DocumentElement, 'id'>[],
  ): Promise<Document> {
    const doc = await this.createDocument(name);
    const ws = await WsClient.connect(this.session.baseURL, doc.id, this.session.token);
    try {
      for (const element of elements) {
        await ws.sendAndConfirm({
          group: 'elements',
          type: 'add',
          properties: { element: { id: crypto.randomUUID(), ...element } },
        });
      }
    } finally {
      await ws.close();
    }
    return fetchJson(this.api.documents.get(doc.id), DocumentSchema);
  }

  @step('Export document {0} by email and wait until the job completes')
  async exportByEmailAndWait(documentId: number, to: string): Promise<ExportJob> {
    const { jobId } = await fetchJson(this.api.export.email(documentId, to), ExportJobCreatedSchema);
    return waitFor(
      () => fetchJson(this.api.export.job(jobId), ExportJobSchema),
      (job) => job.status === EXPORT_STATUS.completed,
      { timeout: 10_000, description: `export job ${jobId} to complete` },
    );
  }
}
