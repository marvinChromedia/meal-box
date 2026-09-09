import type { Recipe, RecipeInput } from '@mealbox/shared';

import { API_MODE } from '../../lib/api/config';
import { apiRequest } from '../../lib/api/http';
import { ApiClientError } from '../../lib/api/http';
import { mockDelay } from '../../lib/api/mockDelay';

/**
 * Shape both implementations below satisfy. Hooks (hooks.ts) call `recipesApi`
 * through this interface only — swapping mock for http (AC5) means changing
 * `VITE_API_MODE`, never the hooks.
 */
export interface RecipesApi {
  list(): Promise<Recipe[]>;
  get(id: string): Promise<Recipe>;
  create(input: RecipeInput): Promise<Recipe>;
  update(id: string, input: RecipeInput): Promise<Recipe>;
  setFavorite(id: string, isFavorite: boolean): Promise<Recipe>;
  remove(id: string): Promise<void>;
}

const httpRecipesApi: RecipesApi = {
  list: () => apiRequest<Recipe[]>('/recipes'),
  get: (id) => apiRequest<Recipe>(`/recipes/${id}`),
  create: (input) => apiRequest<Recipe>('/recipes', { method: 'POST', body: input }),
  update: (id, input) => apiRequest<Recipe>(`/recipes/${id}`, { method: 'PUT', body: input }),
  setFavorite: (id, isFavorite) =>
    apiRequest<Recipe>(`/recipes/${id}`, { method: 'PATCH', body: { isFavorite } }),
  remove: (id) => apiRequest<void>(`/recipes/${id}`, { method: 'DELETE' }),
};

function createSeedRecipes(): Recipe[] {
  return [
    {
      id: 'recipe-1',
      title: 'Garlic Butter Pasta',
      ingredients: [
        { id: 'ing-1', name: 'Spaghetti', quantity: 200, unit: 'g' },
        { id: 'ing-2', name: 'Garlic', quantity: 3, unit: 'clove' },
        { id: 'ing-3', name: 'Butter', quantity: 2, unit: 'tbsp' },
      ],
      steps: ['Boil pasta', 'Melt butter with garlic', 'Toss together'],
      tags: ['quick', 'vegetarian'],
      isFavorite: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'recipe-2',
      title: 'Chicken Stir Fry',
      ingredients: [
        { id: 'ing-4', name: 'Chicken breast', quantity: 300, unit: 'g' },
        { id: 'ing-5', name: 'Soy sauce', quantity: 2, unit: 'tbsp' },
        { id: 'ing-6', name: 'Bell pepper', quantity: 1, unit: 'whole' },
      ],
      steps: ['Slice chicken and vegetables', 'Stir fry chicken', 'Add vegetables and sauce'],
      tags: ['weeknight'],
      isFavorite: false,
      createdAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    },
  ];
}

let mockRecipes: Recipe[] = createSeedRecipes();

/** Test-only: restores the mock recipes to their seed state, so tests in the same file don't leak mutations into each other. */
export function __resetMockRecipesForTests(): void {
  mockRecipes = createSeedRecipes();
}

const mockRecipesApi: RecipesApi = {
  async list() {
    await mockDelay();
    return mockRecipes;
  },
  async get(id) {
    await mockDelay();
    const recipe = mockRecipes.find((r) => r.id === id);
    if (!recipe) {
      throw new ApiClientError(`Recipe ${id} not found`, 'NOT_FOUND', 404);
    }
    return recipe;
  },
  async create(input) {
    await mockDelay();
    const now = new Date().toISOString();
    const recipe: Recipe = {
      id: `recipe-${mockRecipes.length + 1}`,
      ...input,
      ingredients: input.ingredients.map((ingredient, index) => ({
        ...ingredient,
        id: `ing-new-${index}`,
      })),
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
    };
    mockRecipes = [...mockRecipes, recipe];
    return recipe;
  },
  async update(id, input) {
    await mockDelay();
    const existing = mockRecipes.find((r) => r.id === id);
    if (!existing) {
      throw new ApiClientError(`Recipe ${id} not found`, 'NOT_FOUND', 404);
    }
    const updated: Recipe = {
      ...existing,
      ...input,
      ingredients: input.ingredients.map((ingredient, index) => ({
        ...ingredient,
        id: existing.ingredients[index]?.id ?? `ing-new-${index}`,
      })),
      updatedAt: new Date().toISOString(),
    };
    mockRecipes = mockRecipes.map((r) => (r.id === id ? updated : r));
    return updated;
  },
  async setFavorite(id, isFavorite) {
    await mockDelay();
    const existing = mockRecipes.find((r) => r.id === id);
    if (!existing) {
      throw new ApiClientError(`Recipe ${id} not found`, 'NOT_FOUND', 404);
    }
    const updated: Recipe = { ...existing, isFavorite, updatedAt: new Date().toISOString() };
    mockRecipes = mockRecipes.map((r) => (r.id === id ? updated : r));
    return updated;
  },
  async remove(id) {
    await mockDelay();
    mockRecipes = mockRecipes.filter((r) => r.id !== id);
  },
};

export const recipesApi: RecipesApi = API_MODE === 'http' ? httpRecipesApi : mockRecipesApi;
