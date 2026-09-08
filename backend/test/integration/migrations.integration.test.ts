import { describe, expect, it } from 'vitest';

import { createTestPool } from './testDb.js';

const pool = createTestPool();

describe('migrations (integration)', () => {
  it('AC1: creates the recipes, recipe_ingredients, shopping_lists and shopping_list_items tables', async () => {
    const { rows } = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
    );
    const tableNames = rows.map((r) => r.table_name);

    expect(tableNames).toEqual(
      expect.arrayContaining([
        'recipes',
        'recipe_ingredients',
        'shopping_lists',
        'shopping_list_items',
        'shopping_list_item_sources',
      ]),
    );
  });

  it('AC5: re-running the migrations that globalSetup already applied is a no-op, not an error', async () => {
    const { register } = await import('tsx/esm/api');
    const unregister = register();
    try {
      const { default: runMigrations } = await import('node-pg-migrate');
      const applied = await runMigrations({
        databaseUrl: process.env.TEST_DATABASE_URL!,
        dir: new URL('../../migrations', import.meta.url).pathname,
        direction: 'up',
        migrationsTable: 'pgmigrations',
        logger: { info: () => {}, warn: console.warn, error: console.error },
      });

      expect(applied).toEqual([]);
    } finally {
      unregister();
    }
  });
});
