import type { Pool } from 'pg';

import { createRecipe, listRecipes } from '../repositories/recipesRepository.js';
import { findUserByEmail } from '../repositories/usersRepository.js';
import { DEFAULT_RECIPES } from './defaultRecipes.js';

export class UserNotFoundError extends Error {
  constructor(email: string) {
    super(`no account found for ${email}`);
  }
}

export interface SeedRecipesResult {
  userId: string;
  seeded: string[];
  alreadyPresent: string[];
}

// TEST-259: the operator-run counterpart to TEST-254's automatic signup
// seeding — for an account that registered before that shipped, or a demo
// account that needs repopulating. Idempotent by title: safe to run twice
// against the same account, since a recipe title already present (from a
// previous run, or one the user happens to have created themselves) is
// never re-created.
export async function seedRecipesForEmail(pool: Pool, email: string): Promise<SeedRecipesResult> {
  const found = await findUserByEmail(pool, email);
  if (!found) {
    throw new UserNotFoundError(email);
  }

  const existingTitles = new Set((await listRecipes(pool, found.user.id)).map((recipe) => recipe.title));
  const toSeed = DEFAULT_RECIPES.filter((recipe) => !existingTitles.has(recipe.title));

  for (const recipe of toSeed) {
    await createRecipe(pool, recipe, found.user.id);
  }

  return {
    userId: found.user.id,
    seeded: toSeed.map((recipe) => recipe.title),
    alreadyPresent: DEFAULT_RECIPES.filter((recipe) => existingTitles.has(recipe.title)).map(
      (recipe) => recipe.title,
    ),
  };
}
