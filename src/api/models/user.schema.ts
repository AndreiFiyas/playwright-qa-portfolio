import { z } from 'zod';

export const PLANS = { paid: 'paid', free: 'free' } as const;
export type Plan = (typeof PLANS)[keyof typeof PLANS];

export const TestUserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  password: z.string().min(1),
  plan: z.enum(['paid', 'free']),
});
export type TestUser = z.infer<typeof TestUserSchema>;

export const LoginResponseSchema = z.object({
  token: z.uuid(),
  userId: z.uuid(),
  expiresIn: z.number().int().positive(),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const ErrorSchema = z.object({
  error: z.string(),
  field: z.string().optional(),
});
