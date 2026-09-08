import { useState } from 'react';
import type { FormEvent } from 'react';

import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Input } from '../../components/ui/Input';
import { LoadingState } from '../../components/ui/LoadingState';
import { Modal } from '../../components/ui/Modal';
import { useRecipes } from '../recipes/hooks';
import { ShoppingListItemRow } from './ShoppingListItemRow';
import {
  useAddShoppingListItem,
  useClearShoppingList,
  useRemoveShoppingListItem,
  useShoppingList,
  useUpdateShoppingListItem,
} from './hooks';

export function ShoppingList() {
  const listQuery = useShoppingList();
  const recipesQuery = useRecipes();
  const addItem = useAddShoppingListItem();
  const updateItem = useUpdateShoppingListItem();
  const removeItem = useRemoveShoppingListItem();
  const clearList = useClearShoppingList();

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  const recipesById = new Map((recipesQuery.data ?? []).map((recipe) => [recipe.id, recipe] as const));
  const items = listQuery.data?.items ?? [];

  function handleAddItem(event: FormEvent) {
    event.preventDefault();
    const parsedQuantity = Number(quantity);
    if (!name.trim() || !unit.trim() || !Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      return;
    }
    addItem.mutate(
      { name: name.trim(), quantity: parsedQuantity, unit: unit.trim() },
      {
        onSuccess: () => {
          setName('');
          setQuantity('');
          setUnit('');
        },
      },
    );
  }

  function handleConfirmClear() {
    clearList.mutate(
      items.map((item) => item.id),
      { onSuccess: () => setClearConfirmOpen(false) },
    );
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6 sm:py-10">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Shopping List</h1>
        {items.length > 0 ? (
          <Button variant="outline" size="sm" onClick={() => setClearConfirmOpen(true)}>
            Clear list
          </Button>
        ) : null}
      </div>

      {listQuery.isPending ? (
        <LoadingState label="Loading your shopping list…" rows={4} />
      ) : listQuery.isError && listQuery.error.code !== 'SHOPPING_LIST_NOT_FOUND' ? (
        // Every other error is a real failure. This one code means "no list
        // has ever been generated" — a fresh install, not a screen behind on
        // work. The mock never modeled it (its `get()` never 404s), so this
        // only surfaced once the client actually ran against the real API.
        <ErrorState
          message={listQuery.error.message}
          code={listQuery.error.code}
          onRetry={() => listQuery.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState title="No shopping list yet" description="Select recipes and generate a list to see it here." />
      ) : (
        <ul className="flex flex-col">
          {items.map((item) => (
            <ShoppingListItemRow
              key={item.id}
              item={item}
              recipesById={recipesById}
              onToggle={(checked) => updateItem.mutate({ itemId: item.id, patch: { checked } })}
              onQuantityChange={(newQuantity) =>
                updateItem.mutate({ itemId: item.id, patch: { quantity: newQuantity } })
              }
              onRemove={() => removeItem.mutate(item.id)}
              removing={removeItem.isPending && removeItem.variables === item.id}
            />
          ))}
        </ul>
      )}

      {updateItem.isError ? (
        <ErrorState title="Couldn't update that item" message={updateItem.error.message} code={updateItem.error.code} />
      ) : null}
      {removeItem.isError ? (
        <ErrorState title="Couldn't remove that item" message={removeItem.error.message} code={removeItem.error.code} />
      ) : null}
      {clearList.isError ? (
        <ErrorState title="Couldn't clear the list" message={clearList.error.message} code={clearList.error.code} />
      ) : null}

      <form
        onSubmit={handleAddItem}
        className="flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-end"
      >
        <Input
          label="Item"
          placeholder="e.g. Paper towels"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="flex-1"
        />
        <Input
          label="Quantity"
          type="number"
          min="0"
          step="any"
          placeholder="1"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          className="w-24"
        />
        <Input
          label="Unit"
          placeholder="e.g. roll"
          value={unit}
          onChange={(event) => setUnit(event.target.value)}
          className="w-28"
        />
        <Button type="submit" disabled={addItem.isPending}>
          Add item
        </Button>
      </form>

      {addItem.isError ? (
        <ErrorState title="Couldn't add that item" message={addItem.error.message} code={addItem.error.code} />
      ) : null}

      <Modal open={clearConfirmOpen} title="Clear the whole list?" onClose={() => setClearConfirmOpen(false)}>
        <p>
          This removes all {items.length} item{items.length === 1 ? '' : 's'} from your shopping list. This can&apos;t
          be undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setClearConfirmOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={handleConfirmClear} disabled={clearList.isPending}>
            Clear list
          </Button>
        </div>
      </Modal>
    </main>
  );
}
