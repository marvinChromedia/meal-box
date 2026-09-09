import type { Request } from 'express';
import { Router } from 'express';
import type { Pool } from 'pg';

import { createRecipesController } from '../controllers/recipesController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireOwner } from '../middleware/requireOwner.js';
import * as recipesService from '../services/recipesService.js';
import {
  recipeFavoriteInputSchema,
  recipeIdParamSchema,
  recipeInputSchema,
} from '../schemas/recipeSchemas.js';
import { validateBody, validateParams } from '../middleware/validate.js';

export function createRecipesRouter(pool: Pool): Router {
  const controller = createRecipesController(pool);
  const router = Router();

  const getOwnerId = (req: Request) => recipesService.getRecipeOwnerId(pool, req.params.id);

  router.post('/', validateBody(recipeInputSchema), asyncHandler(controller.createRecipe));
  router.get('/', asyncHandler(controller.listRecipes));
  router.get(
    '/:id',
    validateParams(recipeIdParamSchema),
    requireOwner(getOwnerId),
    asyncHandler(controller.getRecipe),
  );
  router.put(
    '/:id',
    validateParams(recipeIdParamSchema),
    requireOwner(getOwnerId),
    validateBody(recipeInputSchema),
    asyncHandler(controller.updateRecipe),
  );
  router.patch(
    '/:id',
    validateParams(recipeIdParamSchema),
    requireOwner(getOwnerId),
    validateBody(recipeFavoriteInputSchema),
    asyncHandler(controller.setFavorite),
  );
  router.delete(
    '/:id',
    validateParams(recipeIdParamSchema),
    requireOwner(getOwnerId),
    asyncHandler(controller.deleteRecipe),
  );

  return router;
}
