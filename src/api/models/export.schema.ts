import { z } from 'zod';

export const ExportJobCreatedSchema = z.object({
  jobId: z.uuid(),
  status: z.literal('QUEUED'),
});

export const ExportJobSchema = z.object({
  jobId: z.uuid(),
  channel: z.enum(['email', 'print']),
  status: z.enum(['QUEUED', 'PROCESSING', 'COMPLETED']),
});
export type ExportJob = z.infer<typeof ExportJobSchema>;
