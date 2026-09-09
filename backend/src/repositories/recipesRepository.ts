import { randomUUID } from 'node:crypto';

import type { Recipe, RecipeInput } from '@mealbox/shared';
import type { Pool } from 'pg';
import { z } from 'zod';

import type { Queryable } from '../db/queryable.js';
import { withTransaction } from '../db/withTransaction.js';

const ingredientRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  quantity: z.number(),
  unit: z.string(),
});

const recipeRowSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  steps: z.array(z.string()),
  tags: z.array(z.string()),
  is_favorite: z.boolean(),
  created_at: z.date(),
  updated_at: z.date(),
  ingredients: z.array(ingredientRowSchema),
});

function mapRowToRecipe(row: z.infer<typeof recipeRowSchema>): Recipe {
  return {
    id: row.id,
    title: row.title,
    ingredients: row.ingredients,
    steps: row.steps,
    tags: row.tags,
    isFavorite: row.is_favorite,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

const RECIPE_SELECT = `
  SELECT
    r.id,
    r.title,
    r.steps,
    r.tags,
    r.is_favorite,
    r.created_at,
    r.updated_at,
    COALESCE(
      json_agg(
        json_build_object('id', ri.id, 'name', ri.name, 'quantity', ri.quantity, 'unit', ri.unit)
        ORDER BY ri.position
      ) FILTER (WHERE ri.id IS NOT NULL),
      '[]'
    ) AS ingredients
  FROM recipes r
  LEFT JOIN recipe_ingredients ri ON ri.recipe_id = r.id
`;

export async function createRecipe(pool: Pool, input: RecipeInput, userId: string): Promise<Recipe> {
  const id = randomUUID();

  const recipe = await withTransaction(pool, async (client) => {
    await client.query(
      `INSERT INTO recipes (id, title, steps, tags, user_id) VALUES ($1, $2, $3, $4, $5)`,
      [id, input.title, input.steps, input.tags, userId],
    );

    await Promise.all(
      input.ingredients.map((ingredient, position) =>
        client.query(
          `INSERT INTO recipe_ingredients (id, recipe_id, name, quantity, unit, position)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [randomUUID(), id, ingredient.name, ingredient.quantity, ingredient.unit, position],
        ),
      ),
    );

    return getRecipeById(client, id);
  });

  if (!recipe) {
    throw new Error(`recipe ${id} was not found immediately after being created`);
  }
  return recipe;
}

export async function getRecipeById(db: Queryable, id: string): Promise<Recipe | null> {
  const result = await db.query(`${RECIPE_SELECT} WHERE r.id = $1 GROUP BY r.id`, [id]);
  const [row] = result.rows;
  if (!row) return null;
  return mapRowToRecipe(recipeRowSchema.parse(row));
}

// Used only to wire the requireOwner middleware into the by-id routes — kept
// separate from getRecipeById so user_id never has to become part of the
// public Recipe shape returned to clients.
export async function getRecipeOwnerId(db: Queryable, id: string): Promise<string | null> {
  const result = await db.query('SELECT user_id FROM recipes WHERE id = $1', [id]);
  const [row] = result.rows as { user_id: string | null }[];
  return row?.user_id ?? null;
}

export async function listRecipes(db: Queryable, userId: string): Promise<Recipe[]> {
  const result = await db.query(`${RECIPE_SELECT} WHERE r.user_id = $1 GROUP BY r.id ORDER BY r.created_at`, [
    userId,
  ]);
  return result.rows.map((row) => mapRowToRecipe(recipeRowSchema.parse(row)));
}

export async function updateRecipe(
  pool: Pool,
  id: string,
  input: RecipeInput,
): Promise<Recipe | null> {
  return withTransaction(pool, async (client) => {
    const updateResult = await client.query(
      `UPDATE recipes SET title = $2, steps = $3, tags = $4, updated_at = now() WHERE id = $1`,
      [id, input.title, input.steps, input.tags],
    );
    if (updateResult.rowCount === 0) {
      return null;
    }

    await client.query(`DELETE FROM recipe_ingredients WHERE recipe_id = $1`, [id]);
    await Promise.all(
      input.ingredients.map((ingredient, position) =>
        client.query(
          `INSERT INTO recipe_ingredients (id, recipe_id, name, quantity, unit, position)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [randomUUID(), id, ingredient.name, ingredient.quantity, ingredient.unit, position],
        ),
      ),
    );

    return getRecipeById(client, id);
  });
}

export async function deleteRecipe(db: Queryable, id: string): Promise<boolean> {
  const result = await db.query('DELETE FROM recipes WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}
