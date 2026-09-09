import type { Recipe, ShoppingListItem } from '@mealbox/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
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

function renderRow(overrides: Partial<ComponentProps<typeof ShoppingListItemRow>> = {}) {
  return render(
    <ShoppingListItemRow
      item={makeItem()}
      recipesById={new Map()}
      onToggle={vi.fn()}
      onQuantityChange={vi.fn()}
      onRemove={vi.fn()}
      removing={false}
      {...overrides}
    />,
  );
}

describe('ShoppingListItemRow', () => {
  it('renders the item name on the checkbox and its quantity/unit in the editable field (AC1)', () => {
    renderRow({ item: makeItem({ quantity: 2, unit: 'whole' }) });

    expect(screen.getByRole('checkbox', { name: 'Spaghetti' })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /quantity for spaghetti/i })).toHaveValue(2);
    expect(screen.getByText('whole')).toBeInTheDocument();
  });

  it('marks a manual item (empty sourceRecipeIds) as "Added by you" (AC2)', () => {
    renderRow({ item: makeItem({ sourceRecipeIds: [] }) });
    expect(screen.getByText('Added by you')).toBeInTheDocument();
  });

  it('shows which recipe(s) contributed a generated item (AC2)', () => {
    const recipe = makeRecipe({ id: 'recipe-1', title: 'Garlic Butter Pasta' });
    renderRow({
      item: makeItem({ sourceRecipeIds: ['recipe-1'] }),
      recipesById: new Map([['recipe-1', recipe]]),
    });

    expect(screen.getByText('From Garlic Butter Pasta')).toBeInTheDocument();
  });

  it('labels a source recipe that no longer exists rather than rendering blank', () => {
    renderRow({ item: makeItem({ sourceRecipeIds: ['deleted-recipe'] }) });
    expect(screen.getByText('From Recipe removed')).toBeInTheDocument();
  });

  it('calls onToggle when the checkbox is clicked', () => {
    const onToggle = vi.fn();
    renderRow({ item: makeItem({ checked: false }), onToggle });

    fireEvent.click(screen.getByRole('checkbox'));
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('calls onRemove when the remove button is clicked (AC6)', () => {
    const onRemove = vi.fn();
    renderRow({ onRemove });

    fireEvent.click(screen.getByRole('button', { name: /remove spaghetti/i }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  describe('quantity edit (TEST-154)', () => {
    it('saves a valid quantity change (AC1)', () => {
      const onQuantityChange = vi.fn();
      renderRow({ item: makeItem({ quantity: 200 }), onQuantityChange });

      fireEvent.change(screen.getByRole('spinbutton', { name: /quantity for spaghetti/i }), {
        target: { value: '150' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      expect(onQuantityChange).toHaveBeenCalledWith(150);
      expect(screen.queryByText(/enter a quantity/i)).not.toBeInTheDocument();
    });

    it('does not call onQuantityChange when the value is unchanged', () => {
      const onQuantityChange = vi.fn();
      renderRow({ item: makeItem({ quantity: 200 }), onQuantityChange });

      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      expect(onQuantityChange).not.toHaveBeenCalled();
    });

    it.each([
      ['empty', ''],
      ['not a number', 'abc'],
      ['negative', '-5'],
      ['zero', '0'],
    ])('rejects a quantity that is %s, with a message on the field, and keeps the previous value (AC3)', (_label, value) => {
      const onQuantityChange = vi.fn();
      renderRow({ item: makeItem({ quantity: 200 }), onQuantityChange });

      const field = screen.getByRole('spinbutton', { name: /quantity for spaghetti/i });
      fireEvent.change(field, { target: { value } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      expect(onQuantityChange).not.toHaveBeenCalled();
      expect(screen.getByText(/enter a quantity greater than 0/i)).toBeInTheDocument();
      expect(field).toHaveAttribute('aria-invalid', 'true');
    });

    it('syncs the field to a new real quantity (e.g. after a successful save)', () => {
      const { rerender } = renderRow({ item: makeItem({ quantity: 200 }) });
      rerender(
        <ShoppingListItemRow
          item={makeItem({ quantity: 150 })}
          recipesById={new Map()}
          onToggle={vi.fn()}
          onQuantityChange={vi.fn()}
          onRemove={vi.fn()}
          removing={false}
        />,
      );

      expect(screen.getByRole('spinbutton', { name: /quantity for spaghetti/i })).toHaveValue(150);
    });
  });
});
