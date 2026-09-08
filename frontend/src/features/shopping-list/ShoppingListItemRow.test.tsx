import type { Recipe, ShoppingListItem } from '@recipe-box/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ShoppingListItemRow } from './ShoppingListItemRow';

function makeItem(overrides: Partial<ShoppingListItem> = {}): ShoppingListItem {
  return {
    id: 'item-1',
    name: 'Spaghetti',
    quantity: 200,
    unit: 'g',
    checked: false,
    sourceRecipeIds: [],
    ...overrides,
  };
}

function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'recipe-1',
    title: 'Garlic Butter Pasta',
    ingredients: [],
    steps: [],
    tags: [],
    isFavorite: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('ShoppingListItemRow', () => {
  it('renders the combined name, quantity and unit as one line item (AC1)', () => {
    render(
      <ShoppingListItemRow
        item={makeItem({ quantity: 2, unit: 'whole' })}
        recipesById={new Map()}
        onToggle={vi.fn()}
        onRemove={vi.fn()}
        removing={false}
      />,
    );

    expect(screen.getByLabelText('Spaghetti — 2 whole')).toBeInTheDocument();
  });

  it('marks a manual item (empty sourceRecipeIds) as "Added by you" (AC2)', () => {
    render(
      <ShoppingListItemRow
        item={makeItem({ sourceRecipeIds: [] })}
        recipesById={new Map()}
        onToggle={vi.fn()}
        onRemove={vi.fn()}
        removing={false}
      />,
    );

    expect(screen.getByText('Added by you')).toBeInTheDocument();
  });

  it('shows which recipe(s) contributed a generated item (AC2)', () => {
    const recipe = makeRecipe({ id: 'recipe-1', title: 'Garlic Butter Pasta' });
    render(
      <ShoppingListItemRow
        item={makeItem({ sourceRecipeIds: ['recipe-1'] })}
        recipesById={new Map([['recipe-1', recipe]])}
        onToggle={vi.fn()}
        onRemove={vi.fn()}
        removing={false}
      />,
    );

    expect(screen.getByText('From Garlic Butter Pasta')).toBeInTheDocument();
  });

  it('labels a source recipe that no longer exists rather than rendering blank', () => {
    render(
      <ShoppingListItemRow
        item={makeItem({ sourceRecipeIds: ['deleted-recipe'] })}
        recipesById={new Map()}
        onToggle={vi.fn()}
        onRemove={vi.fn()}
        removing={false}
      />,
    );

    expect(screen.getByText('From Recipe removed')).toBeInTheDocument();
  });

  it('calls onToggle when the checkbox is clicked (AC3)', () => {
    const onToggle = vi.fn();
    render(
      <ShoppingListItemRow
        item={makeItem({ checked: false })}
        recipesById={new Map()}
        onToggle={onToggle}
        onRemove={vi.fn()}
        removing={false}
      />,
    );

    fireEvent.click(screen.getByRole('checkbox'));
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('calls onRemove when the remove button is clicked (AC6)', () => {
    const onRemove = vi.fn();
    render(
      <ShoppingListItemRow
        item={makeItem()}
        recipesById={new Map()}
        onToggle={vi.fn()}
        onRemove={onRemove}
        removing={false}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /remove spaghetti/i }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
