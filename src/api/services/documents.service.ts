import type { ApiClient } from '@api/client/api-client';
import { DocumentListSchema, DocumentSchema, VersionListSchema } from '@api/models/document.schema';

export class DocumentsService {
  constructor(private readonly client: ApiClient) {}

  list() {
    return this.client.get('/api/documents', DocumentListSchema);
  }

  create(data: { name?: unknown; pages?: unknown }) {
    return this.client.post('/api/documents', DocumentSchema, { data });
  }

  get(id: number) {
    return this.client.get(`/api/documents/${id}`, DocumentSchema);
  }

  rename(id: number, name: string) {
    return this.client.patch(`/api/documents/${id}`, DocumentSchema, { data: { name } });
  }

  remove(id: number) {
    return this.client.delete(`/api/documents/${id}`);
  }

  versions(id: number) {
    return this.client.get(`/api/documents/${id}/versions`, VersionListSchema);
  }

  /** Test-only endpoint: terminates every live WebSocket of the document. */
  dropConnections(id: number) {
    return this.client.post(`/api/debug/documents/${id}/drop-connections`);
  }
}
