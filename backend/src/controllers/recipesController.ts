import type { RecipeInput } from '@recipe-box/shared';
import type { Request, Response } from 'express';
import type { Pool } from 'pg';

import * as recipesService from '../services/recipesService.js';

const RECIPE_NOT_FOUND = {
  error: { message: 'recipe not found', code: 'RECIPE_NOT_FOUND' },
};

export function createRecipesController(pool: Pool) {
  return {
    async createRecipe(req: Request<object, unknown, RecipeInput>, res: Response): Promise<void> {
      const recipe = await recipesService.createRecipe(pool, req.body);
      res.status(201).json(recipe);
    },

    async listRecipes(_req: Request, res: Response): Promise<void> {
      const recipes = await recipesService.listRecipes(pool);
      res.json(recipes);
    },

    async getRecipe(req: Request<{ id: string }>, res: Response): Promise<void> {
      const recipe = await recipesService.getRecipe(pool, req.params.id);
      if (!recipe) {
        res.status(404).json(RECIPE_NOT_FOUND);
        return;
      }
      res.json(recipe);
    },

    async updateRecipe(
      req: Request<{ id: string }, unknown, RecipeInput>,
      res: Response,
    ): Promise<void> {
      const recipe = await recipesService.updateRecipe(pool, req.params.id, req.body);
      if (!recipe) {
        res.status(404).json(RECIPE_NOT_FOUND);
        return;
      }
      res.json(recipe);
    },

    async deleteRecipe(req: Request<{ id: string }>, res: Response): Promise<void> {
      const deleted = await recipesService.deleteRecipe(pool, req.params.id);
      if (!deleted) {
        res.status(404).json(RECIPE_NOT_FOUND);
        return;
      }
      res.status(204).send();
    },
  };
}
