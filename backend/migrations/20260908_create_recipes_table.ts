import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('recipes', {
    id: { type: 'uuid', primaryKey: true },
    title: { type: 'text', notNull: true },
    steps: { type: 'text[]', notNull: true, default: pgm.func("'{}'::text[]") },
    tags: { type: 'text[]', notNull: true, default: pgm.func("'{}'::text[]") },
    is_favorite: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('recipe_ingredients', {
    id: { type: 'uuid', primaryKey: true },
    recipe_id: {
      type: 'uuid',
      notNull: true,
      references: 'recipes',
      onDelete: 'CASCADE',
    },
    name: { type: 'text', notNull: true },
    quantity: { type: 'numeric', notNull: true },
    unit: { type: 'text', notNull: true },
    position: { type: 'integer', notNull: true },
  });

  pgm.createIndex('recipe_ingredients', 'recipe_id');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('recipe_ingredients');
  pgm.dropTable('recipes');
}
