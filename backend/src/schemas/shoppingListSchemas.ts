import type { GenerateShoppingListInput } from '@recipe-box/shared';
import { z } from 'zod';

export const generateShoppingListInputSchema = z
  .object({
    // Empty is valid (AC6) — regeneration then drops every non-edited
    // generated item and keeps everything else.
    recipeIds: z.array(z.string().uuid()),
  })
  .strict() satisfies z.ZodType<GenerateShoppingListInput>;
