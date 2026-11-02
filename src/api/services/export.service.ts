import type { ApiClient } from '@api/client/api-client';
import { ExportJobCreatedSchema, ExportJobSchema } from '@api/models/export.schema';

export class ExportService {
  constructor(private readonly client: ApiClient) {}

  email(documentId: number, to: string, subject?: string) {
    return this.client.post('/api/export/email', ExportJobCreatedSchema, { data: { documentId, to, subject } });
  }

  print(documentId: number) {
    return this.client.post('/api/export/print', ExportJobCreatedSchema, { data: { documentId } });
  }

  job(jobId: string) {
    return this.client.get(`/api/export/jobs/${jobId}`, ExportJobSchema);
  }
}
