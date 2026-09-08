export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

export interface Recipe {
  id: string;
  title: string;
  ingredients: Ingredient[];
  steps: string[];
  tags: string[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  checked: boolean;
  /** Empty for an item the user added by hand rather than one generated from a recipe. */
  sourceRecipeIds: string[];
}

export interface ShoppingList {
  id: string;
  items: ShoppingListItem[];
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export type IngredientInput = Omit<Ingredient, 'id'>;

export type RecipeInput = Pick<Recipe, 'title' | 'steps' | 'tags'> & {
  ingredients: IngredientInput[];
};

export type ShoppingListItemInput = Pick<ShoppingListItem, 'name' | 'quantity' | 'unit'>;

export interface GenerateShoppingListInput {
  recipeIds: string[];
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface ApiError {
  error: {
    message: string;
    code: string;
  };
}
