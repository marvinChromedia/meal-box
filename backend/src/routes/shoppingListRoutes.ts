import { Router } from 'express';
import type { Pool } from 'pg';

import { createShoppingListController } from '../controllers/shoppingListController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validateBody } from '../middleware/validate.js';
import { generateShoppingListInputSchema } from '../schemas/shoppingListSchemas.js';

export function createShoppingListRouter(pool: Pool): Router {
  const controller = createShoppingListController(pool);
  const router = Router();

  router.post(
    '/',
    validateBody(generateShoppingListInputSchema),
    asyncHandler(controller.generate),
  );
  router.get('/', asyncHandler(controller.getCurrent));

  return router;
}
