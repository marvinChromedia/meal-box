import { randomUUID } from 'node:crypto';

import type {
  GenerateShoppingListInput,
  Recipe,
  ShoppingList,
  ShoppingListItemInput,
} from '@recipe-box/shared';
import type { Pool } from 'pg';

import * as recipesRepository from '../repositories/recipesRepository.js';
import type {
  ShoppingListItemForMerge,
  ShoppingListItemPatch,
  ShoppingListItemUpsert,
} from '../repositories/shoppingListsRepository.js';
import * as shoppingListsRepository from '../repositories/shoppingListsRepository.js';

export interface AggregatedIngredient {
  name: string;
  quantity: number;
  unit: string;
  sourceRecipeIds: string[];
}

export interface MergeResult {
  upserts: ShoppingListItemUpsert[];
  deletions: string[];
}

function normalizeIngredientName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Combines ingredients that share a name (case-insensitive, trimmed) across
 * the given recipes, summing quantities and recording which recipes
 * contributed. Matching is by name equality only (AC4) — a same-named
 * ingredient with a different unit is still combined, and the resulting
 * quantity is a raw sum across whatever units are present; unit-aware
 * combination is explicitly out of scope for this ticket.
 *
 * Pure and DB-free so it is unit-testable on its own (ticket DoD).
 */
export function aggregateIngredients(recipes: Recipe[]): AggregatedIngredient[] {
  const byNormalizedName = new Map<string, AggregatedIngredient>();

  for (const recipe of recipes) {
    for (const ingredient of recipe.ingredients) {
      const key = normalizeIngredientName(ingredient.name);
      const existing = byNormalizedName.get(key);

      if (existing) {
        existing.quantity += ingredient.quantity;
        if (!existing.sourceRecipeIds.includes(recipe.id)) {
          existing.sourceRecipeIds.push(recipe.id);
        }
      } else {
        byNormalizedName.set(key, {
          name: ingredient.name.trim(),
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          sourceRecipeIds: [recipe.id],
        });
      }
    }
  }

  return [...byNormalizedName.values()];
}

/**
 * Applies the binding TEST-76 decision (Beacon comment on the ticket):
 * regeneration merges into the existing list rather than replacing it.
 *
 *  1. A generated item that was never hand-edited is freely overwritten.
 *  2. A generated item whose quantity was hand-edited keeps that quantity —
 *     regeneration never touches it — but its sourceRecipeIds still refreshes.
 *  3. A manual item (empty sourceRecipeIds) is outside matching entirely and
 *     is never touched here.
 *  4. Checked-off state is preserved for any item that survives regeneration
 *     under the same name match.
 *  5. An ingredient no longer required by any selected recipe is dropped if
 *     it was never hand-edited, kept if it was.
 *
 * Pure and DB-free so it is unit-testable on its own (ticket DoD).
 */
export function mergeShoppingList(
  existing: ShoppingListItemForMerge[],
  aggregated: AggregatedIngredient[],
): MergeResult {
  const existingByName = new Map<string, ShoppingListItemForMerge>();
  for (const item of existing) {
    // Manual items are never matched against aggregation — rule 3.
    if (item.sourceRecipeIds.length === 0) continue;
    existingByName.set(normalizeIngredientName(item.name), item);
  }

  let nextPosition =
    existing.length > 0 ? Math.max(...existing.map((item) => item.position)) + 1 : 0;

  const upserts: ShoppingListItemUpsert[] = [];
  const matchedNames = new Set<string>();

  for (const aggregatedItem of aggregated) {
    const key = normalizeIngredientName(aggregatedItem.name);
    const match = existingByName.get(key);

    if (!match) {
      upserts.push({
        id: randomUUID(),
        name: aggregatedItem.name,
        quantity: aggregatedItem.quantity,
        unit: aggregatedItem.unit,
        checked: false,
        quantityEdited: false,
        sourceRecipeIds: aggregatedItem.sourceRecipeIds,
        position: nextPosition++,
      });
      continue;
    }

    matchedNames.add(key);
    upserts.push({
      id: match.id,
      name: aggregatedItem.name,
      // Rule 2: a hand-edited quantity is never recalculated.
      quantity: match.quantityEdited ? match.quantity : aggregatedItem.quantity,
      unit: aggregatedItem.unit,
      // Rule 4: checked state survives regeneration.
      checked: match.checked,
      quantityEdited: match.quantityEdited,
      sourceRecipeIds: aggregatedItem.sourceRecipeIds,
      position: match.position,
    });
  }

  const deletions: string[] = [];
  for (const [key, item] of existingByName) {
    if (matchedNames.has(key)) continue;
    // Rule 5: drop if never hand-edited, keep (untouched) if it was.
    if (!item.quantityEdited) {
      deletions.push(item.id);
    }
  }

  return { upserts, deletions };
}

/**
 * Generates or regenerates the shopping list from the given recipe ids.
 * Returns null when a referenced recipe id does not exist — the caller maps
 * that to a 404 — without having written anything (AC6: never a half-written
 * list). Deduplicates repeated recipe ids so a duplicate selection can't
 * double-count an ingredient.
 */
export async function generateShoppingList(
  pool: Pool,
  input: GenerateShoppingListInput,
): Promise<ShoppingList | null> {
  const uniqueRecipeIds = [...new Set(input.recipeIds)];

  const recipes: Recipe[] = [];
  for (const recipeId of uniqueRecipeIds) {
    const recipe = await recipesRepository.getRecipeById(pool, recipeId);
    if (!recipe) {
      return null;
    }
    recipes.push(recipe);
  }

  const aggregated = aggregateIngredients(recipes);
  const current = await shoppingListsRepository.getCurrentShoppingListForMerge(pool);
  const { upserts, deletions } = mergeShoppingList(current?.items ?? [], aggregated);

  return shoppingListsRepository.applyShoppingListMerge(pool, {
    listId: current?.id ?? null,
    upserts,
    deletions,
  });
}

export async function getCurrentShoppingList(pool: Pool): Promise<ShoppingList | null> {
  return shoppingListsRepository.getCurrentShoppingList(pool);
}

export async function addShoppingListItem(
  pool: Pool,
  input: ShoppingListItemInput,
): Promise<ShoppingList> {
  return shoppingListsRepository.addShoppingListItem(pool, input);
}

/** Returns null when the item id doesn't exist — the caller maps that to a 404. */
export async function updateShoppingListItem(
  pool: Pool,
  itemId: string,
  patch: ShoppingListItemPatch,
): Promise<ShoppingList | null> {
  const updated = await shoppingListsRepository.updateShoppingListItem(pool, itemId, patch);
  if (!updated) return null;
  return shoppingListsRepository.getCurrentShoppingList(pool);
}

/** Returns null when the item id doesn't exist — the caller maps that to a 404. */
export async function removeShoppingListItem(
  pool: Pool,
  itemId: string,
): Promise<ShoppingList | null> {
  const removed = await shoppingListsRepository.removeShoppingListItem(pool, itemId);
  if (!removed) return null;
  return shoppingListsRepository.getCurrentShoppingList(pool);
}
