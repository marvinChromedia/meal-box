import type { RecipeInput } from '@mealbox/shared';
import { z } from 'zod';

export const ingredientInputSchema = z
  .object({
    name: z.string().min(1),
    quantity: z.number(),
    // Free text on the shared contract — an empty unit is valid for
    // countable ingredients ("2 onions"), so no min length here.
    unit: z.string(),
  })
  .strict();

export const recipeInputSchema = z
  .object({
    title: z.string().min(1),
    steps: z.array(z.string()).min(1),
    tags: z.array(z.string()),
    ingredients: z.array(ingredientInputSchema).min(1),
  })
  .strict() satisfies z.ZodType<RecipeInput>;

export const recipeIdParamSchema = z
  .object({
    id: z.string().uuid(),
  })
  .strict();
