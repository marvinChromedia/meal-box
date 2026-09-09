import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Recipe } from '@mealbox/shared';
import { describe, expect, it, vi } from 'vitest';

import { RecipeListItem } from './RecipeListItem';

const recipe: Recipe = {
  id: 'recipe-1',
  title: 'Garlic Butter Pasta',
  ingredients: [{ id: 'ing-1', name: 'Spaghetti', quantity: 200, unit: 'g' }],
  steps: ['Boil pasta'],
  tags: [],
  isFavorite: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderItem(selected: boolean, onToggle = vi.fn()) {
  return render(
    <MemoryRouter>
      <RecipeListItem recipe={recipe} selection={{ selected, onToggle }} />
    </MemoryRouter>,
  );
}

describe('RecipeListItem selection mode', () => {
  it('renders exactly one interactive element per row', () => {
    renderItem(false);

    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it("the checkbox's accessible name is exactly the recipe title", () => {
    renderItem(false);

    expect(screen.getByLabelText('Garlic Butter Pasta')).toBeInstanceOf(HTMLInputElement);
  });

  it('clicking the invisible stretched label (which visually covers the whole row) toggles selection', () => {
    // jsdom doesn't do layout/hit-testing, so we can't simulate "click any
    // pixel in the row" the way a real browser resolves it — but we CAN
    // exercise the actual mechanism that makes that work: native
    // label-for-control click forwarding, which jsdom does implement.
    const onToggle = vi.fn();
    const { container } = renderItem(false, onToggle);

    const overlayLabel = container.querySelector('label[aria-hidden="true"]');
    expect(overlayLabel).toBeTruthy();
    fireEvent.click(overlayLabel!);

    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('clicking the checkbox itself still toggles selection', () => {
    const onToggle = vi.fn();
    renderItem(false, onToggle);

    fireEvent.click(screen.getByLabelText('Garlic Butter Pasta'));

    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('renders the accent ring when selected, not the old blue one', () => {
    renderItem(true);

    const checkbox = screen.getByLabelText('Garlic Butter Pasta');
    const card = checkbox.closest('.relative')?.querySelector('.ring-accent');
    expect(card).toBeTruthy();
    expect(checkbox.closest('.relative')?.querySelector('.ring-blue-600')).toBeNull();
  });

  it('the checkbox is a real, enabled input — reachable by keyboard for free', () => {
    renderItem(false);

    const checkbox = screen.getByLabelText('Garlic Butter Pasta') as HTMLInputElement;
    expect(checkbox.tagName).toBe('INPUT');
    expect(checkbox.type).toBe('checkbox');
    expect(checkbox).not.toBeDisabled();
  });
});

describe('RecipeListItem outside selection mode', () => {
  it('links to the recipe detail route with the accent focus ring, not the old blue one', () => {
    render(
      <MemoryRouter>
        <RecipeListItem recipe={recipe} />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: /garlic butter pasta/i });
    expect(link).toHaveClass('focus-visible:ring-accent');
    expect(link.className).not.toContain('ring-blue-500');
  });
});

describe('RecipeListItem favorite star (TEST-123)', () => {
  it('renders no star when onToggleFavorite is not provided', () => {
    render(
      <MemoryRouter>
        <RecipeListItem recipe={recipe} />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders an unfavorited star, aria-pressed false', () => {
    render(
      <MemoryRouter>
        <RecipeListItem recipe={recipe} onToggleFavorite={vi.fn()} />
      </MemoryRouter>,
    );

    const star = screen.getByRole('button', { name: 'Favorite Garlic Butter Pasta' });
    expect(star).toHaveAttribute('aria-pressed', 'false');
    expect(star).toHaveTextContent('☆');
  });

  it('renders a favorited star, aria-pressed true', () => {
    render(
      <MemoryRouter>
        <RecipeListItem recipe={{ ...recipe, isFavorite: true }} onToggleFavorite={vi.fn()} />
      </MemoryRouter>,
    );

    const star = screen.getByRole('button', { name: 'Unfavorite Garlic Butter Pasta' });
    expect(star).toHaveAttribute('aria-pressed', 'true');
    expect(star).toHaveTextContent('★');
  });

  it('clicking the star calls onToggleFavorite with the recipe, without navigating', () => {
    const onToggleFavorite = vi.fn();
    render(
      <MemoryRouter>
        <RecipeListItem recipe={recipe} onToggleFavorite={onToggleFavorite} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Favorite Garlic Butter Pasta' }));

    expect(onToggleFavorite).toHaveBeenCalledOnce();
    expect(onToggleFavorite).toHaveBeenCalledWith(recipe);
  });

  it('clicking the star in selection mode toggles favorite, not selection', () => {
    const onToggle = vi.fn();
    const onToggleFavorite = vi.fn();
    render(
      <MemoryRouter>
        <RecipeListItem
          recipe={recipe}
          selection={{ selected: false, onToggle }}
          onToggleFavorite={onToggleFavorite}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Favorite Garlic Butter Pasta' }));

    expect(onToggleFavorite).toHaveBeenCalledOnce();
    expect(onToggleFavorite).toHaveBeenCalledWith(recipe);
    expect(onToggle).not.toHaveBeenCalled();
  });
});
