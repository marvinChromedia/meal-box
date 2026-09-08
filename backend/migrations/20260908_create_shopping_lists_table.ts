import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('shopping_lists', {
    id: { type: 'uuid', primaryKey: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('shopping_list_items', {
    id: { type: 'uuid', primaryKey: true },
    shopping_list_id: {
      type: 'uuid',
      notNull: true,
      references: 'shopping_lists',
      onDelete: 'CASCADE',
    },
    name: { type: 'text', notNull: true },
    quantity: { type: 'numeric', notNull: true },
    unit: { type: 'text', notNull: true },
    checked: { type: 'boolean', notNull: true, default: false },
    position: { type: 'integer', notNull: true },
  });

  pgm.createIndex('shopping_list_items', 'shopping_list_id');

  // Deliberately no foreign key to recipes: AC2 requires that deleting a recipe
  // still leaves the shopping list item's record of which recipe(s) it came
  // from intact, so this is a soft reference rather than an enforced FK.
  pgm.createTable('shopping_list_item_sources', {
    id: { type: 'uuid', primaryKey: true },
    shopping_list_item_id: {
      type: 'uuid',
      notNull: true,
      references: 'shopping_list_items',
      onDelete: 'CASCADE',
    },
    recipe_id: { type: 'uuid', notNull: true },
  });

  pgm.createIndex('shopping_list_item_sources', ['shopping_list_item_id', 'recipe_id'], {
    unique: true,
    name: 'shopping_list_item_sources_item_recipe_unique',
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('shopping_list_item_sources');
  pgm.dropTable('shopping_list_items');
  pgm.dropTable('shopping_lists');
}
