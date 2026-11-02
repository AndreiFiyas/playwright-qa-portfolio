import { z } from 'zod';

export const ElementSchema = z.object({
  id: z.string(),
  type: z.enum(['text', 'checkmark', 'stamp']),
  page: z.number().int().positive(),
  x: z.number(),
  y: z.number(),
  content: z.string(),
});
export type DocumentElement = z.infer<typeof ElementSchema>;

export const DocumentSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1),
  pageCount: z.number().int().positive(),
  pageOrder: z.array(z.number().int().positive()),
  elements: z.array(ElementSchema),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Document = z.infer<typeof DocumentSchema>;

export const DocumentListSchema = z.object({
  items: z.array(DocumentSchema),
  total: z.number().int().nonnegative(),
});

export const VersionSchema = z.object({
  id: z.uuid(),
  label: z.string(),
  createdAt: z.iso.datetime(),
  elementCount: z.number().int().nonnegative(),
});
export type Version = z.infer<typeof VersionSchema>;

export const VersionListSchema = z.object({ items: z.array(VersionSchema) });
