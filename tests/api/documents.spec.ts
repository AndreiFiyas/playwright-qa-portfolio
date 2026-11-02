import { fetchJson } from '@api/client/api-client';
import { DocumentListSchema, DocumentSchema } from '@api/models/document.schema';
import { ErrorSchema } from '@api/models/user.schema';
import { test } from '@fixtures/api.fixture';
import { FEATURES } from '@utils/constants';
import { expectWithStep, objectContaining } from '@utils/expect-with-step';
import { meta } from '@utils/meta';

test.describe('Documents API', meta().feature(FEATURES.documents).build(), () => {
  test('create, read, rename and delete a document', meta().testId('API-DOC-001').severity('critical').build(), async ({ api }) => {
    const created = await fetchJson(api.documents.create({ name: 'Lease agreement', pages: 4 }), DocumentSchema);
    await expectWithStep(created, 'created document').toEqual(
      objectContaining({ name: 'Lease agreement', pageCount: 4, pageOrder: [1, 2, 3, 4], elements: [] }),
    );

    const renamed = await fetchJson(api.documents.rename(created.id, 'Lease agreement v2'), DocumentSchema);
    await expectWithStep(renamed.name, 'name after rename').toBe('Lease agreement v2');

    const list = await fetchJson(api.documents.list(), DocumentListSchema);
    await expectWithStep(list.items.map((d) => d.id), 'listed ids').toEqual([created.id]);

    await expectWithStep((await api.documents.remove(created.id)).status(), 'delete status').toBe(204);
    await expectWithStep((await api.documents.get(created.id)).status(), 'status after delete').toBe(404);
  });

  // Data-driven negative cases: one table, one test body.
  const invalidPayloads = [
    { title: 'missing name', data: { pages: 2 }, field: 'name' },
    { title: 'blank name', data: { name: '   ', pages: 2 }, field: 'name' },
    { title: 'zero pages', data: { name: 'Doc', pages: 0 }, field: 'pages' },
    { title: 'too many pages', data: { name: 'Doc', pages: 21 }, field: 'pages' },
    { title: 'fractional pages', data: { name: 'Doc', pages: 1.5 }, field: 'pages' },
  ];
  for (const { title, data, field } of invalidPayloads) {
    test(`creation is rejected: ${title}`, meta().testId(`API-DOC-002-${field}`).build(), async ({ api }) => {
      const response = await api.documents.create(data);

      await expectWithStep(response.status(), 'status').toBe(422);
      await expectWithStep(ErrorSchema.parse(await response.json()), 'error').toEqual({ error: 'VALIDATION_ERROR', field });
    });
  }

  test("a user cannot read another user's document", meta().testId('API-DOC-003').severity('critical').build(), async ({ api, steps, createUserApi }) => {
    const document = await steps.createDocument('Private');
    const strangerApi = await createUserApi();

    await expectWithStep((await strangerApi.documents.get(document.id)).status(), 'stranger status').toBe(404);
    await expectWithStep((await api.documents.get(document.id)).status(), 'owner status').toBe(200);
  });
});
