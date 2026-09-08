import type { Recipe, RecipeInput } from '@recipe-box/shared';
import type { Pool } from 'pg';

import * as recipesRepository from '../repositories/recipesRepository.js';

export async function createRecipe(pool: Pool, input: RecipeInput): Promise<Recipe> {
  return recipesRepository.createRecipe(pool, input);
}

export async function listRecipes(pool: Pool): Promise<Recipe[]> {
  return recipesRepository.listRecipes(pool);
}

export async function getRecipe(pool: Pool, id: string): Promise<Recipe | null> {
  return recipesRepository.getRecipeById(pool, id);
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
