import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { __resetMockShoppingListForTests } from './api';
import { ShoppingList } from './ShoppingList';

function renderShoppingList() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ShoppingList />
    </QueryClientProvider>,
  );
}

describe('ShoppingList (against the typed mock)', () => {
  beforeEach(() => {
    __resetMockShoppingListForTests();
  });

  it('shows a loading state, then the mock list items', async () => {
    renderShoppingList();

    expect(screen.getByRole('status')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByRole('checkbox', { name: /Spaghetti/ })).toBeInTheDocument());
    expect(screen.getByRole('checkbox', { name: /Garlic/ })).toBeInTheDocument();
  });

  it('checks an item off, which is reflected without waiting on a server round trip (AC3)', async () => {
    renderShoppingList();
    await waitFor(() => expect(screen.getByRole('checkbox', { name: /Spaghetti/ })).toBeInTheDocument());

    const checkbox = screen.getByRole('checkbox', { name: /Spaghetti/ });
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);

    await waitFor(() => expect(checkbox).toBeChecked());
  });

  it('adds a manual item through the form, which appears marked as added by hand (AC5)', async () => {
    renderShoppingList();
    await waitFor(() => expect(screen.getByRole('checkbox', { name: /Spaghetti/ })).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Item'), { target: { value: 'Paper towels' } });
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Unit'), { target: { value: 'roll' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));

    await waitFor(() => expect(screen.getByRole('checkbox', { name: /Paper towels/ })).toBeInTheDocument());
    const addedBadges = screen.getAllByText('Added by you');
    expect(addedBadges.length).toBeGreaterThan(0);

    // Form clears after a successful add.
    expect(screen.getByLabelText('Item')).toHaveValue('');
  });

  it('removes an item, which disappears from the list (AC6)', async () => {
    renderShoppingList();
    await waitFor(() => expect(screen.getByRole('checkbox', { name: /Spaghetti/ })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /remove spaghetti/i }));

    await waitFor(() =>
      expect(screen.queryByRole('checkbox', { name: /Spaghetti/ })).not.toBeInTheDocument(),
    );
  });
});
