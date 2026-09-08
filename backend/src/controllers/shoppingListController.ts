import type { GenerateShoppingListInput, ShoppingListItemInput } from '@recipe-box/shared';
import type { Request, Response } from 'express';
import type { Pool } from 'pg';

import type { ShoppingListItemPatch } from '../repositories/shoppingListsRepository.js';
import * as shoppingListService from '../services/shoppingListService.js';

const RECIPE_NOT_FOUND = {
  error: { message: 'one or more selected recipes do not exist', code: 'RECIPE_NOT_FOUND' },
};

const SHOPPING_LIST_NOT_FOUND = {
  error: { message: 'no shopping list has been generated yet', code: 'SHOPPING_LIST_NOT_FOUND' },
};

const SHOPPING_LIST_ITEM_NOT_FOUND = {
  error: { message: 'shopping list item not found', code: 'SHOPPING_LIST_ITEM_NOT_FOUND' },
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

    async addItem(
      req: Request<object, unknown, ShoppingListItemInput>,
      res: Response,
    ): Promise<void> {
      const list = await shoppingListService.addShoppingListItem(pool, req.body);
      res.status(201).json(list);
    },

    async updateItem(
      req: Request<{ id: string }, unknown, ShoppingListItemPatch>,
      res: Response,
    ): Promise<void> {
      const list = await shoppingListService.updateShoppingListItem(pool, req.params.id, req.body);
      if (!list) {
        res.status(404).json(SHOPPING_LIST_ITEM_NOT_FOUND);
        return;
      }
      res.json(list);
    },

    async removeItem(req: Request<{ id: string }>, res: Response): Promise<void> {
      const list = await shoppingListService.removeShoppingListItem(pool, req.params.id);
      if (!list) {
        res.status(404).json(SHOPPING_LIST_ITEM_NOT_FOUND);
        return;
      }
      res.json(list);
    },
  };
}
