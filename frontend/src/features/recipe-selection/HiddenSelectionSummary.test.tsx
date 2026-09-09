import { fireEvent, render, screen } from '@testing-library/react';
import type { Recipe } from '@mealbox/shared';
import { describe, expect, it, vi } from 'vitest';

import { HiddenSelectionSummary } from './HiddenSelectionSummary';

function makeRecipe(id: string, title: string): Recipe {
  return {
    id,
    title,
    ingredients: [],
    steps: [],
    tags: [],
    isFavorite: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('HiddenSelectionSummary', () => {
  it('renders nothing when there are no hidden-selected recipes', () => {
    const { container } = render(<HiddenSelectionSummary recipes={[]} onRemove={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders one chip per hidden-selected recipe with an accessible remove control', () => {
    render(
      <HiddenSelectionSummary
        recipes={[
          makeRecipe('recipe-1', 'Garlic Butter Pasta'),
          makeRecipe('recipe-2', 'Chicken Stir Fry'),
        ]}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByText('Garlic Butter Pasta')).toBeInTheDocument();
    expect(screen.getByText('Chicken Stir Fry')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Remove Garlic Butter Pasta from selection' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Remove Chicken Stir Fry from selection' }),
    ).toBeInTheDocument();
  });

  it('calls onRemove with the recipe id when a chip is removed', () => {
    const onRemove = vi.fn();
    render(
      <HiddenSelectionSummary
        recipes={[makeRecipe('recipe-1', 'Garlic Butter Pasta')]}
        onRemove={onRemove}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Remove Garlic Butter Pasta from selection' }),
    );

    expect(onRemove).toHaveBeenCalledOnce();
    expect(onRemove).toHaveBeenCalledWith('recipe-1');
  });
});
