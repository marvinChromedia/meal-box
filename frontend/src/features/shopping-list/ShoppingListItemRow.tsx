import type { Recipe, ShoppingListItem } from '@recipe-box/shared';
import { clsx } from 'clsx';

import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';

interface ShoppingListItemRowProps {
  item: ShoppingListItem;
  /** Recipe id -> Recipe, for showing which recipes contributed this line (AC2). */
  recipesById: Map<string, Recipe>;
  onToggle: (checked: boolean) => void;
  onRemove: () => void;
  removing: boolean;
}

/**
 * One line of the shopping list: a big (44px) checkbox whose own label is
 * the quantity/unit/name — tapping anywhere on that text toggles it, which
 * is most of AC7's "comfortably tappable" without a custom hit-area hack.
 * Checked state is native `<input type="checkbox">`, so it's announced to
 * assistive tech and shown by shape (a checkmark), not colour alone.
 */
export function ShoppingListItemRow({ item, recipesById, onToggle, onRemove, removing }: ShoppingListItemRowProps) {
  const isManual = item.sourceRecipeIds.length === 0;
  // A source recipe id with no match was deleted after this item was
  // generated — TEST-78 kept no foreign key back to the recipe on purpose,
  // so this is expected, not a bug. Say so rather than rendering blank.
  const sourceLabels = item.sourceRecipeIds.map((id) => recipesById.get(id)?.title ?? 'Recipe removed');

  return (
    <li className="flex items-start justify-between gap-3 border-b border-gray-100 py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <Checkbox
          size="lg"
          label={`${item.name} — ${item.quantity} ${item.unit}`}
          checked={item.checked}
          onChange={(event) => onToggle(event.target.checked)}
        />
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
