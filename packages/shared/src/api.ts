import { z } from 'zod';

/** Error body returned by every API route. */
export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
