import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

// Whether a shopping list item's quantity has been hand-edited. Cannot be
// inferred by comparing the stored quantity against what aggregation would
// produce — editing 2 to 2 still counts as edited (TEST-154 AC2) — so it is
// an explicit, persisted flag rather than a derived value.
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn('shopping_list_items', {
    quantity_edited: { type: 'boolean', notNull: true, default: false },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn('shopping_list_items', 'quantity_edited');
}
