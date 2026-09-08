import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError } from '../../lib/api/http';
import { __resetMockShoppingListForTests, shoppingListApi } from './api';
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

  it('shows the empty state (not an error) when no list has ever been generated', async () => {
    // The real backend 404s with this code before the first generation ever
    // happens; the mock's `get()` never does, since it always has a seeded
    // list. Found by actually running against the real server (VITE_API_MODE
    // now defaults to http) — the mock alone would never have caught this.
    const getSpy = vi
      .spyOn(shoppingListApi, 'get')
      .mockRejectedValueOnce(new ApiClientError('no shopping list has been generated yet', 'SHOPPING_LIST_NOT_FOUND', 404));

    renderShoppingList();

    await waitFor(() => expect(screen.getByText('No shopping list yet')).toBeInTheDocument());
    expect(screen.queryByText(/no shopping list has been generated yet/)).not.toBeInTheDocument();

    getSpy.mockRestore();
  });

  it('checks an item off, which is reflected without waiting on a server round trip (AC3)', async () => {
    renderShoppingList();
    await waitFor(() => expect(screen.getByRole('checkbox', { name: /Spaghetti/ })).toBeInTheDocument());

    const checkbox = screen.getByRole('checkbox', { name: /Spaghetti/ });
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);

    await waitFor(() => expect(checkbox).toBeChecked());
    // Let the underlying mutation and its invalidation-triggered refetch fully
    // settle before the test ends — otherwise that work resolves in the
    // background after teardown and mutates the next test's freshly-reset
    // mock list out from under it (same shared-mutable-mock hazard TEST-235
    // covers, one file over: a test finishing before its own async work does).
    await new Promise((resolve) => setTimeout(resolve, 400));
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

  it('edits a quantity through the row, which the screen saves via the same mutation as check-off', async () => {
    renderShoppingList();
    await waitFor(() => expect(screen.getByRole('checkbox', { name: /Spaghetti/ })).toBeInTheDocument());

    // Every row has its own "Save" button, so scope to Spaghetti's row rather
    // than the ambiguous page-wide query.
    const row = screen.getByRole('checkbox', { name: /Spaghetti/ }).closest('li')!;
    fireEvent.change(within(row).getByRole('spinbutton', { name: /quantity for spaghetti/i }), {
      target: { value: '150' },
    });
    fireEvent.click(within(row).getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(within(row).getByRole('spinbutton', { name: /quantity for spaghetti/i })).toHaveValue(150),
    );
    await new Promise((resolve) => setTimeout(resolve, 400));
  });

  describe('clearing the list (AC4, AC5, AC6)', () => {
    it('asks for confirmation before clearing, stating what will be lost', async () => {
      renderShoppingList();
      await waitFor(() => expect(screen.getByRole('checkbox', { name: /Spaghetti/ })).toBeInTheDocument());

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Clear list' }));

      const dialog = screen.getByRole('dialog', { name: 'Clear the whole list?' });
      expect(dialog).toHaveTextContent('2 items');
    });

    it('changes nothing when the confirmation is cancelled', async () => {
      renderShoppingList();
      await waitFor(() => expect(screen.getByRole('checkbox', { name: /Spaghetti/ })).toBeInTheDocument());

      const checkbox = screen.getByRole('checkbox', { name: /Spaghetti/ });
      fireEvent.click(checkbox);
      await waitFor(() => expect(checkbox).toBeChecked());

      fireEvent.click(screen.getByRole('button', { name: 'Clear list' }));
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /Spaghetti/ })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: /Garlic/ })).toBeInTheDocument();
    });

    it('clears every item on confirm, after which the empty state explains how to start again', async () => {
      renderShoppingList();
      await waitFor(() => expect(screen.getByRole('checkbox', { name: /Spaghetti/ })).toBeInTheDocument());

      fireEvent.click(screen.getByRole('button', { name: 'Clear list' }));
      const dialog = screen.getByRole('dialog', { name: 'Clear the whole list?' });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Clear list' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      // The dialog closes on the mutation's own success, but the invalidated
      // query's background refetch is a separate round trip that can still
      // be in flight — the old (now-stale) items stay visible until it
      // completes, so this needs its own wait rather than a same-tick assertion.
      await waitFor(() => expect(screen.queryByRole('checkbox', { name: /Spaghetti/ })).not.toBeInTheDocument());
      expect(screen.getByText('No shopping list yet')).toBeInTheDocument();
      expect(screen.getByText('Select recipes and generate a list to see it here.')).toBeInTheDocument();
      await new Promise((resolve) => setTimeout(resolve, 400));
    });
  });
});
