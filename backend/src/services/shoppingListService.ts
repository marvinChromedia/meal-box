import { randomUUID } from 'node:crypto';

import type {
  GenerateShoppingListInput,
  Recipe,
  ShoppingList,
  ShoppingListItemInput,
} from '@mealbox/shared';
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

function normalizeUnit(unit: string): string {
  return unit.trim().toLowerCase();
}

type UnitClass = 'mass-metric' | 'volume-metric' | 'other';

// TEST-246: the entire closed set. Deliberately just the abbreviations named
// in the ticket's own AC1 — no aliases (e.g. "gram", "litre") since nothing
// in this codebase's recipe data uses spelled-out units, and the DoD calls
// for "a small, explicit, closed set — no open-ended unit parser".
const MASS_METRIC_TO_GRAMS: Record<string, number> = { g: 1, kg: 1000 };
const VOLUME_METRIC_TO_ML: Record<string, number> = { ml: 1, l: 1000 };

function classifyUnit(unit: string): UnitClass {
  const normalized = normalizeUnit(unit);
  if (normalized in MASS_METRIC_TO_GRAMS) return 'mass-metric';
  if (normalized in VOLUME_METRIC_TO_ML) return 'volume-metric';
  return 'other';
}

function toBaseQuantity(quantity: number, unit: string, unitClass: UnitClass): number {
  if (unitClass === 'mass-metric') return quantity * MASS_METRIC_TO_GRAMS[normalizeUnit(unit)]!;
  if (unitClass === 'volume-metric') return quantity * VOLUME_METRIC_TO_ML[normalizeUnit(unit)]!;
  return quantity;
}

/**
 * Groups ingredients for aggregation and merge alike: same normalized name,
 * and either the same literal unit or both units in the same closed-set
 * metric class (TEST-246 AC1/AC2). An unrecognised or empty unit is its own
 * bucket — it only combines with an identical literal unit, never guessed
 * into a metric class, so it can never throw or silently misconvert.
 *
 * Shared by aggregateIngredients and mergeShoppingList so the two paths can
 * never disagree about what counts as "the same line" (ticket note: verify
 * the conversion isn't duplicated across the generate and merge paths).
 */
function aggregationKey(name: string, unit: string): string {
  const unitClass = classifyUnit(unit);
  const unitPart = unitClass === 'other' ? normalizeUnit(unit) : unitClass;
  return `${normalizeIngredientName(name)} ${unitPart}`;
}

/**
 * Rounds to 2 decimal places, round-half-up (TEST-246 AC5) — the one
 * rounding rule, applied at the one place a quantity is finalized.
 */
function roundQuantity(quantity: number): number {
  return Math.round(quantity * 100) / 100;
}

interface IngredientGroup {
  name: string;
  unitClass: UnitClass;
  /** First-seen literal unit, verbatim — used as the output unit for 'other' groups. */
  literalUnit: string;
  /** Base-unit (g/ml) running total for metric classes; raw running total otherwise. */
  quantitySum: number;
  sourceRecipeIds: string[];
}

function finalizeGroup(group: IngredientGroup): AggregatedIngredient {
  const base = { name: group.name, sourceRecipeIds: group.sourceRecipeIds };

  if (group.unitClass === 'mass-metric' || group.unitClass === 'volume-metric') {
    // AC1: displayed in the larger unit once the total warrants it.
    const useLargerUnit = group.quantitySum >= 1000;
    const unit =
      group.unitClass === 'mass-metric' ? (useLargerUnit ? 'kg' : 'g') : useLargerUnit ? 'l' : 'ml';
    const quantity = useLargerUnit ? group.quantitySum / 1000 : group.quantitySum;
    return { ...base, quantity: roundQuantity(quantity), unit };
  }

  return { ...base, quantity: roundQuantity(group.quantitySum), unit: group.literalUnit };
}

/**
 * Combines ingredients that share a name (case-insensitive, trimmed) and a
 * compatible unit across the given recipes, summing quantities and
 * recording which recipes contributed. "Compatible" means identical, or both
 * within the same closed-set metric class (TEST-246 AC1) — anything else,
 * including no unit at all, only combines with an exact literal match (AC2:
 * there is no defensible conversion between a count and a mass).
 *
 * Pure and DB-free so it is unit-testable on its own (ticket DoD).
 */
export function aggregateIngredients(recipes: Recipe[]): AggregatedIngredient[] {
  const groups = new Map<string, IngredientGroup>();

  for (const recipe of recipes) {
    for (const ingredient of recipe.ingredients) {
      const unitClass = classifyUnit(ingredient.unit);
      const key = aggregationKey(ingredient.name, ingredient.unit);
      const contribution = toBaseQuantity(ingredient.quantity, ingredient.unit, unitClass);
      const existing = groups.get(key);

      if (existing) {
        existing.quantitySum += contribution;
        if (!existing.sourceRecipeIds.includes(recipe.id)) {
          existing.sourceRecipeIds.push(recipe.id);
        }
      } else {
        groups.set(key, {
          name: ingredient.name.trim(),
          unitClass,
          literalUnit: ingredient.unit,
          quantitySum: contribution,
          sourceRecipeIds: [recipe.id],
        });
      }
    }
  }

  return [...groups.values()].map(finalizeGroup);
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
 *     under the same name+unit-class match.
 *  5. An ingredient no longer required by any selected recipe (under its
 *     current name+unit-class) is dropped if it was never hand-edited, kept
 *     if it was.
 *
 * TEST-246: matching now keys on name *and* unit-class (aggregationKey), not
 * name alone, since two lines can now share a name but belong to different
 * unit groups (AC2). This means an existing line can go unmatched purely
 * because aggregation now splits its name into a different-keyed group —
 * rule 5 already covers that correctly with no new logic: an unmatched
 * hand-edited line is kept untouched, and the new group inserts as a
 * separate line (see docs/features/TEST-246-shopping-list-unit-conversion.md
 * for the worked example — this is the deliberate AC4 decision).
 *
 * Pure and DB-free so it is unit-testable on its own (ticket DoD).
 */
export function mergeShoppingList(
  existing: ShoppingListItemForMerge[],
  aggregated: AggregatedIngredient[],
): MergeResult {
  const existingByKey = new Map<string, ShoppingListItemForMerge>();
  for (const item of existing) {
    // Manual items are never matched against aggregation — rule 3.
    if (item.sourceRecipeIds.length === 0) continue;
    existingByKey.set(aggregationKey(item.name, item.unit), item);
  }

  let nextPosition =
    existing.length > 0 ? Math.max(...existing.map((item) => item.position)) + 1 : 0;

  const upserts: ShoppingListItemUpsert[] = [];
  const matchedKeys = new Set<string>();

  for (const aggregatedItem of aggregated) {
    const key = aggregationKey(aggregatedItem.name, aggregatedItem.unit);
    const match = existingByKey.get(key);

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

    matchedKeys.add(key);
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
  for (const [key, item] of existingByKey) {
    if (matchedKeys.has(key)) continue;
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
