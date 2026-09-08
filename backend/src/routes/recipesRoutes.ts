import { Router } from 'express';
import type { Pool } from 'pg';

import { createRecipesController } from '../controllers/recipesController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { recipeIdParamSchema, recipeInputSchema } from '../schemas/recipeSchemas.js';
import { validateBody, validateParams } from '../middleware/validate.js';

export function createRecipesRouter(pool: Pool): Router {
  const controller = createRecipesController(pool);
  const router = Router();

  router.post('/', validateBody(recipeInputSchema), asyncHandler(controller.createRecipe));
  router.get('/', asyncHandler(controller.listRecipes));
  router.get('/:id', validateParams(recipeIdParamSchema), asyncHandler(controller.getRecipe));
  router.put(
    '/:id',
    validateParams(recipeIdParamSchema),
    validateBody(recipeInputSchema),
    asyncHandler(controller.updateRecipe),
  );
  router.delete('/:id', validateParams(recipeIdParamSchema), asyncHandler(controller.deleteRecipe));

  return router;
}
