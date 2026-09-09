import type { GenerateShoppingListInput, ShoppingListItemInput } from '@mealbox/shared';
import { z } from 'zod';

export const generateShoppingListInputSchema = z
  .object({
    // Empty is valid (AC6) — regeneration then drops every non-edited
    // generated item and keeps everything else.
    recipeIds: z.array(z.string().uuid()),
  })
  .strict() satisfies z.ZodType<GenerateShoppingListInput>;

export const addShoppingListItemInputSchema = z
  .object({
    name: z.string().min(1),
    // Free text, same as recipe ingredients — an empty unit is valid for a
    // countable item ("2 onions").
    quantity: z.number().positive(),
    unit: z.string(),
  })
  .strict() satisfies z.ZodType<ShoppingListItemInput>;

// Not (yet) an exported shared type — the frontend client's patch parameter is
// a local inline `Partial<Pick<ShoppingListItem, 'checked'|'quantity'|'unit'>>`
// rather than something from shared/src/types.ts. Matches it structurally.
export const updateShoppingListItemInputSchema = z
  .object({
    checked: z.boolean().optional(),
    quantity: z.number().positive().optional(),
    unit: z.string().optional(),
  })
  .strict()
  .refine((patch) => Object.keys(patch).length > 0, {
    message: 'at least one of checked, quantity or unit must be provided',
  });

export const shoppingListItemIdParamSchema = z
  .object({
    id: z.string().uuid(),
  })
  .strict();
