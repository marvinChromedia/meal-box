import { randomUUID } from 'node:crypto';

import type { ShoppingList } from '@recipe-box/shared';
import type { Pool } from 'pg';
import { z } from 'zod';

import type { Queryable } from '../db/queryable.js';
import { withTransaction } from '../db/withTransaction.js';

export interface NewShoppingListItem {
  name: string;
  quantity: number;
  unit: string;
  checked?: boolean;
  /** Recipe ids this item was aggregated from. Empty for a hand-added item. */
  sourceRecipeIds?: string[];
}

const itemRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  quantity: z.number(),
  unit: z.string(),
  checked: z.boolean(),
  source_recipe_ids: z.array(z.string().uuid()),
});

const shoppingListRowSchema = z.object({
  id: z.string().uuid(),
  created_at: z.date(),
  updated_at: z.date(),
  items: z.array(itemRowSchema),
});

function mapRowToShoppingList(row: z.infer<typeof shoppingListRowSchema>): ShoppingList {
  return {
    id: row.id,
    items: row.items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      checked: item.checked,
      sourceRecipeIds: item.source_recipe_ids,
    })),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

const SHOPPING_LIST_SELECT = `
  WITH item_sources AS (
    SELECT shopping_list_item_id, array_agg(recipe_id ORDER BY recipe_id) AS recipe_ids
    FROM shopping_list_item_sources
    GROUP BY shopping_list_item_id
  )
  SELECT
    sl.id,
    sl.created_at,
    sl.updated_at,
    COALESCE(
      json_agg(
        json_build_object(
          'id', sli.id,
          'name', sli.name,
          'quantity', sli.quantity,
          'unit', sli.unit,
          'checked', sli.checked,
          'source_recipe_ids', COALESCE(isr.recipe_ids, '{}')
        )
        ORDER BY sli.position
      ) FILTER (WHERE sli.id IS NOT NULL),
      '[]'
    ) AS items
  FROM shopping_lists sl
  LEFT JOIN shopping_list_items sli ON sli.shopping_list_id = sl.id
  LEFT JOIN item_sources isr ON isr.shopping_list_item_id = sli.id
`;

export async function createShoppingList(
  pool: Pool,
  items: NewShoppingListItem[],
): Promise<ShoppingList> {
  const listId = randomUUID();

  const list = await withTransaction(pool, async (client) => {
    await client.query(`INSERT INTO shopping_lists (id) VALUES ($1)`, [listId]);

    await Promise.all(
      items.map(async (item, position) => {
        const itemId = randomUUID();
        await client.query(
          `INSERT INTO shopping_list_items (id, shopping_list_id, name, quantity, unit, checked, position)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [itemId, listId, item.name, item.quantity, item.unit, item.checked ?? false, position],
        );

        await Promise.all(
          (item.sourceRecipeIds ?? []).map((recipeId) =>
            client.query(
              `INSERT INTO shopping_list_item_sources (id, shopping_list_item_id, recipe_id)
               VALUES ($1, $2, $3)`,
              [randomUUID(), itemId, recipeId],
            ),
          ),
        );
      }),
    );

    return getShoppingListById(client, listId);
  });

  if (!list) {
    throw new Error(`shopping list ${listId} was not found immediately after being created`);
  }
  return list;
}

export async function getShoppingListById(db: Queryable, id: string): Promise<ShoppingList | null> {
  const result = await db.query(`${SHOPPING_LIST_SELECT} WHERE sl.id = $1 GROUP BY sl.id`, [id]);
  const [row] = result.rows;
  if (!row) return null;
  return mapRowToShoppingList(shoppingListRowSchema.parse(row));
}

/**
 * There is exactly one shopping list in practice: generation merges into it
 * rather than ever creating a second one (see applyShoppingListMerge). This
 * reads "the" list — the earliest row, which is the only row once one exists.
 */
export async function getCurrentShoppingList(db: Queryable): Promise<ShoppingList | null> {
  const result = await db.query(
    `${SHOPPING_LIST_SELECT} GROUP BY sl.id ORDER BY sl.created_at ASC LIMIT 1`,
  );
  const [row] = result.rows;
  if (!row) return null;
  return mapRowToShoppingList(shoppingListRowSchema.parse(row));
}

// --- Internal shapes used only for the regeneration merge (TEST-76). These
// carry quantity_edited and position, which are backend bookkeeping and are
// deliberately not part of the shared ShoppingListItem contract. ---

export interface ShoppingListItemForMerge {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  checked: boolean;
  quantityEdited: boolean;
  sourceRecipeIds: string[];
  position: number;
}

export interface CurrentShoppingListForMerge {
  id: string;
  items: ShoppingListItemForMerge[];
}

const mergeItemRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  quantity: z.number(),
  unit: z.string(),
  checked: z.boolean(),
  quantity_edited: z.boolean(),
  position: z.number(),
  source_recipe_ids: z.array(z.string().uuid()),
});

const currentShoppingListForMergeRowSchema = z.object({
  id: z.string().uuid(),
  items: z.array(mergeItemRowSchema),
});

const CURRENT_SHOPPING_LIST_FOR_MERGE_SELECT = `
  WITH item_sources AS (
    SELECT shopping_list_item_id, array_agg(recipe_id ORDER BY recipe_id) AS recipe_ids
    FROM shopping_list_item_sources
    GROUP BY shopping_list_item_id
  )
  SELECT
    sl.id,
    COALESCE(
      json_agg(
        json_build_object(
          'id', sli.id,
          'name', sli.name,
          'quantity', sli.quantity,
          'unit', sli.unit,
          'checked', sli.checked,
          'quantity_edited', sli.quantity_edited,
          'position', sli.position,
          'source_recipe_ids', COALESCE(isr.recipe_ids, '{}')
        )
        ORDER BY sli.position
      ) FILTER (WHERE sli.id IS NOT NULL),
      '[]'
    ) AS items
  FROM shopping_lists sl
  LEFT JOIN shopping_list_items sli ON sli.shopping_list_id = sl.id
  LEFT JOIN item_sources isr ON isr.shopping_list_item_id = sli.id
  GROUP BY sl.id
  ORDER BY sl.created_at ASC
  LIMIT 1
`;

export async function getCurrentShoppingListForMerge(
  db: Queryable,
): Promise<CurrentShoppingListForMerge | null> {
  const result = await db.query(CURRENT_SHOPPING_LIST_FOR_MERGE_SELECT);
  const [row] = result.rows;
  if (!row) return null;

  const parsed = currentShoppingListForMergeRowSchema.parse(row);
  return {
    id: parsed.id,
    items: parsed.items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      checked: item.checked,
      quantityEdited: item.quantity_edited,
      sourceRecipeIds: item.source_recipe_ids,
      position: item.position,
    })),
  };
}

export interface ShoppingListItemUpsert {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  checked: boolean;
  quantityEdited: boolean;
  sourceRecipeIds: string[];
  position: number;
}

export interface ShoppingListMergeParams {
  /** The list to merge into, or null to create a new one (first-ever generation). */
  listId: string | null;
  upserts: ShoppingListItemUpsert[];
  /** Ids of existing items to remove — superseded, never hand-edited (rule 5). */
  deletions: string[];
}

/**
 * Applies the result of mergeShoppingList (shoppingListService.ts) inside one
 * transaction: creates the list on first generation, deletes items rule 5
 * drops, and upserts everything else. Every upsert already carries a concrete
 * id (fresh for a new item, reused for an existing one), so a single
 * INSERT ... ON CONFLICT handles both — position is excluded from the
 * ON CONFLICT SET clause so an existing item's position is never disturbed.
 */
export async function applyShoppingListMerge(
  pool: Pool,
  params: ShoppingListMergeParams,
): Promise<ShoppingList> {
  const list = await withTransaction(pool, async (client) => {
    let listId = params.listId;
    if (listId) {
      await client.query(`UPDATE shopping_lists SET updated_at = now() WHERE id = $1`, [listId]);
    } else {
      listId = randomUUID();
      await client.query(`INSERT INTO shopping_lists (id) VALUES ($1)`, [listId]);
    }

    if (params.deletions.length > 0) {
      await client.query(`DELETE FROM shopping_list_items WHERE id = ANY($1::uuid[])`, [
        params.deletions,
      ]);
    }

    await Promise.all(
      params.upserts.map(async (item) => {
        await client.query(
          `INSERT INTO shopping_list_items
             (id, shopping_list_id, name, quantity, unit, checked, quantity_edited, position)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             quantity = EXCLUDED.quantity,
             unit = EXCLUDED.unit,
             checked = EXCLUDED.checked,
             quantity_edited = EXCLUDED.quantity_edited`,
          [
            item.id,
            listId,
            item.name,
            item.quantity,
            item.unit,
            item.checked,
            item.quantityEdited,
            item.position,
          ],
        );

        await client.query(
          `DELETE FROM shopping_list_item_sources WHERE shopping_list_item_id = $1`,
          [item.id],
        );
        await Promise.all(
          item.sourceRecipeIds.map((recipeId) =>
            client.query(
              `INSERT INTO shopping_list_item_sources (id, shopping_list_item_id, recipe_id)
               VALUES ($1, $2, $3)`,
              [randomUUID(), item.id, recipeId],
            ),
          ),
        );
      }),
    );

    return getShoppingListById(client, listId);
  });

  if (!list) {
    throw new Error('shopping list was not found immediately after being merged');
  }
  return list;
}
