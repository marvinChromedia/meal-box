import type { GenerateShoppingListInput } from '@recipe-box/shared';
import type { Request, Response } from 'express';
import type { Pool } from 'pg';

import * as shoppingListService from '../services/shoppingListService.js';

const RECIPE_NOT_FOUND = {
  error: { message: 'one or more selected recipes do not exist', code: 'RECIPE_NOT_FOUND' },
};

const SHOPPING_LIST_NOT_FOUND = {
  error: { message: 'no shopping list has been generated yet', code: 'SHOPPING_LIST_NOT_FOUND' },
};

export function createShoppingListController(pool: Pool) {
  return {
    async generate(
      req: Request<object, unknown, GenerateShoppingListInput>,
      res: Response,
    ): Promise<void> {
      const list = await shoppingListService.generateShoppingList(pool, req.body);
      if (!list) {
        res.status(404).json(RECIPE_NOT_FOUND);
        return;
      }
      res.status(200).json(list);
    },

    async getCurrent(_req: Request, res: Response): Promise<void> {
      const list = await shoppingListService.getCurrentShoppingList(pool);
      if (!list) {
        res.status(404).json(SHOPPING_LIST_NOT_FOUND);
        return;
      }
      res.json(list);
    },
  };
}
