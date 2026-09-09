import type { Recipe, ShoppingListItem } from '@mealbox/shared';
import { clsx } from 'clsx';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';
import { Input } from '../../components/ui/Input';

interface ShoppingListItemRowProps {
  item: ShoppingListItem;
  /** Recipe id -> Recipe, for showing which recipes contributed this line (AC2). */
  recipesById: Map<string, Recipe>;
  onToggle: (checked: boolean) => void;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
  removing: boolean;
}

function parseQuantity(raw: string): number | null {
  if (raw.trim() === '') return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

/**
 * One line of the shopping list: a big (44px) checkbox labeled with just the
 * item's name (tapping the name toggles it), a quantity field editable on
 * its own — separate from the checkbox, since the two are independent
 * interactions and combining them into one label (as TEST-77 originally did)
 * would make an editable quantity ambiguous with the toggle target.
 */
export function ShoppingListItemRow({
  item,
  recipesById,
  onToggle,
  onQuantityChange,
  onRemove,
  removing,
}: ShoppingListItemRowProps) {
  const isManual = item.sourceRecipeIds.length === 0;
  // A source recipe id with no match was deleted after this item was
  // generated — TEST-78 kept no foreign key back to the recipe on purpose,
  // so this is expected, not a bug. Say so rather than rendering blank.
  const sourceLabels = item.sourceRecipeIds.map((id) => recipesById.get(id)?.title ?? 'Recipe removed');

  const [draftQuantity, setDraftQuantity] = useState(String(item.quantity));
  const [quantityError, setQuantityError] = useState<string | null>(null);

  // The item's real quantity changed from elsewhere (a successful save, a
  // background refetch) — sync the draft rather than leaving a stale value
  // sitting in the field.
  useEffect(() => {
    setDraftQuantity(String(item.quantity));
    setQuantityError(null);
  }, [item.quantity]);

  function handleQuantitySubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = parseQuantity(draftQuantity);
    if (parsed === null) {
      setQuantityError('Enter a quantity greater than 0');
      return;
    }
    setQuantityError(null);
    if (parsed !== item.quantity) {
      onQuantityChange(parsed);
    }
  }

  return (
    <li className="flex items-start justify-between gap-3 border-b border-gray-100 py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <Checkbox size="lg" label={item.name} checked={item.checked} onChange={(event) => onToggle(event.target.checked)} />

        {/* noValidate: the native min="0" constraint would otherwise silently
            block submission for a negative value before handleQuantitySubmit
            ever runs, so the AC3 error message never has a chance to show —
            our own validation is the only one that should ever speak here. */}
        <form
          onSubmit={handleQuantitySubmit}
          noValidate
          className="mt-2 flex flex-wrap items-center gap-2 pl-9"
        >
          <Input
            label={`Quantity for ${item.name}`}
            hideLabel
            type="number"
            min="0"
            step="any"
            value={draftQuantity}
            onChange={(event) => {
              setDraftQuantity(event.target.value);
              setQuantityError(null);
            }}
            error={quantityError ?? undefined}
            className="w-20"
          />
          <span className="text-sm text-gray-600">{item.unit}</span>
          <Button type="submit" variant="outline" size="sm">
            Save
          </Button>
        </form>

        <p className={clsx('mt-1 pl-9 text-sm', item.checked && 'text-gray-400 line-through')}>
          {isManual ? <Badge>Added by you</Badge> : <span className="text-xs text-gray-500">From {sourceLabels.join(', ')}</span>}
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        disabled={removing}
        aria-label={`Remove ${item.name} from the list`}
      >
        Remove
      </Button>
    </li>
  );
}
