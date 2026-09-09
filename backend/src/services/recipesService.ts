import type { Recipe, RecipeInput } from '@mealbox/shared';
import type { Pool } from 'pg';

import * as recipesRepository from '../repositories/recipesRepository.js';

export async function createRecipe(pool: Pool, input: RecipeInput, userId: string): Promise<Recipe> {
  return recipesRepository.createRecipe(pool, input, userId);
}

export async function listRecipes(pool: Pool, userId: string): Promise<Recipe[]> {
  return recipesRepository.listRecipes(pool, userId);
}

export async function getRecipe(pool: Pool, id: string): Promise<Recipe | null> {
  return recipesRepository.getRecipeById(pool, id);
}

// Used only by the requireOwner middleware wiring in recipesRoutes.ts.
export async function getRecipeOwnerId(pool: Pool, id: string): Promise<string | null> {
  return recipesRepository.getRecipeOwnerId(pool, id);
}

export async function updateRecipe(
  pool: Pool,
  id: string,
  input: RecipeInput,
): Promise<Recipe | null> {
  return recipesRepository.updateRecipe(pool, id, input);
}

export async function deleteRecipe(pool: Pool, id: string): Promise<boolean> {
  return recipesRepository.deleteRecipe(pool, id);
}
