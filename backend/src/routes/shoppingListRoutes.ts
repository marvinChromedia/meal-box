import { Router } from 'express';
import type { Pool } from 'pg';

import { createShoppingListController } from '../controllers/shoppingListController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import {
  addShoppingListItemInputSchema,
  generateShoppingListInputSchema,
  shoppingListItemIdParamSchema,
  updateShoppingListItemInputSchema,
} from '../schemas/shoppingListSchemas.js';

export function createShoppingListRouter(pool: Pool): Router {
  const controller = createShoppingListController(pool);
  const router = Router();

  // Generation is an action, not a plain resource creation — matches the
  // frontend client and its feature doc as merged (TEST-234: the path was
  // POST / here, which 404s against the real client).
  router.post(
    '/generate',
    validateBody(generateShoppingListInputSchema),
    asyncHandler(controller.generate),
  );
  router.get('/', asyncHandler(controller.getCurrent));

  router.post(
    '/items',
    validateBody(addShoppingListItemInputSchema),
    asyncHandler(controller.addItem),
  );
  router.patch(
    '/items/:id',
    validateParams(shoppingListItemIdParamSchema),
    validateBody(updateShoppingListItemInputSchema),
    asyncHandler(controller.updateItem),
  );
  router.delete(
    '/items/:id',
    validateParams(shoppingListItemIdParamSchema),
    asyncHandler(controller.removeItem),
  );

  return router;
}
