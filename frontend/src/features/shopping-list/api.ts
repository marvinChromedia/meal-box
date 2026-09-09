import type {
  GenerateShoppingListInput,
  ShoppingList,
  ShoppingListItem,
  ShoppingListItemInput,
} from '@mealbox/shared';

import { API_MODE } from '../../lib/api/config';
import { apiRequest } from '../../lib/api/http';
import { mockDelay } from '../../lib/api/mockDelay';

/** Same mock/http split as recipes/api.ts — see that file for the rationale. */
export interface ShoppingListApi {
  get(): Promise<ShoppingList>;
  generate(input: GenerateShoppingListInput): Promise<ShoppingList>;
  addItem(input: ShoppingListItemInput): Promise<ShoppingList>;
  updateItem(itemId: string, patch: Partial<Pick<ShoppingListItem, 'checked' | 'quantity' | 'unit'>>): Promise<ShoppingList>;
  removeItem(itemId: string): Promise<ShoppingList>;
}

const httpShoppingListApi: ShoppingListApi = {
  get: () => apiRequest<ShoppingList>('/shopping-list'),
  generate: (input) => apiRequest<ShoppingList>('/shopping-list/generate', { method: 'POST', body: input }),
  addItem: (input) => apiRequest<ShoppingList>('/shopping-list/items', { method: 'POST', body: input }),
  updateItem: (itemId, patch) =>
    apiRequest<ShoppingList>(`/shopping-list/items/${itemId}`, { method: 'PATCH', body: patch }),
  removeItem: (itemId) => apiRequest<ShoppingList>(`/shopping-list/items/${itemId}`, { method: 'DELETE' }),
};

function createSeedShoppingList(): ShoppingList {
  return {
    id: 'shopping-list-1',
    items: [
      { id: 'item-1', name: 'Spaghetti', quantity: 200, unit: 'g', checked: false, sourceRecipeIds: ['recipe-1'] },
      { id: 'item-2', name: 'Garlic', quantity: 3, unit: 'clove', checked: false, sourceRecipeIds: ['recipe-1'] },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

let mockList: ShoppingList = createSeedShoppingList();

/** Test-only: restores the mock list to its seed state, so tests in the same file don't leak mutations into each other. */
export function __resetMockShoppingListForTests(): void {
  mockList = createSeedShoppingList();
}

function touch(list: ShoppingList): ShoppingList {
  return { ...list, updatedAt: new Date().toISOString() };
}

const mockShoppingListApi: ShoppingListApi = {
  async get() {
    await mockDelay();
    return mockList;
  },
  async generate(input) {
    await mockDelay();
    // De-dup by name+unit, same as the backend contract will — quantities from
    // recipes sharing an ingredient add together instead of listing twice.
    const byKey = new Map<string, ShoppingListItem>();
    for (const item of mockList.items) {
      byKey.set(`${item.name}|${item.unit}`, item);
    }
    for (const recipeId of input.recipeIds) {
      byKey.set(`placeholder|${recipeId}`, {
        id: `item-${byKey.size + 1}`,
        name: `Ingredients for ${recipeId}`,
        quantity: 1,
        unit: 'batch',
        checked: false,
        sourceRecipeIds: [recipeId],
      });
    }
    mockList = touch({ ...mockList, items: Array.from(byKey.values()) });
    return mockList;
  },
  async addItem(input) {
    await mockDelay();
    const item: ShoppingListItem = { ...input, id: `item-${mockList.items.length + 1}`, checked: false, sourceRecipeIds: [] };
    mockList = touch({ ...mockList, items: [...mockList.items, item] });
    return mockList;
  },
  async updateItem(itemId, patch) {
    await mockDelay();
    mockList = touch({
      ...mockList,
      items: mockList.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
    });
    return mockList;
  },
  async removeItem(itemId) {
    await mockDelay();
    mockList = touch({ ...mockList, items: mockList.items.filter((item) => item.id !== itemId) });
    return mockList;
  },
};

export const shoppingListApi: ShoppingListApi = API_MODE === 'http' ? httpShoppingListApi : mockShoppingListApi;
