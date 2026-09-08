import { z } from 'zod';

// "The stated rules" (AC1) — a floor, not full password-strength scoring,
// which is out of scope for this ticket.
export const credentialsRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// .strict() so an unexpected extra key — a password field above all —
// fails validation rather than silently passing through (AC1).
const userResponseSchema = z
  .object({
    id: z.string().uuid(),
    email: z.string(),
    createdAt: z.string(),
  })
  .strict();

export const authResponseSchema = z
  .object({
    user: userResponseSchema,
  })
  .strict();

export const errorResponseSchema = z
  .object({
    error: z
      .object({
        message: z.string(),
        code: z.string(),
      })
      .strict(),
  })
  .strict();
