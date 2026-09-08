import { Pool } from 'pg';

export function createTestPool(): Pool {
  const databaseUrl = process.env.TEST_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('TEST_DATABASE_URL must be set to run integration tests');
  }
  return new Pool({ connectionString: databaseUrl });
}

export async function truncateAll(pool: Pool): Promise<void> {
  await pool.query(
    'TRUNCATE TABLE shopping_list_item_sources, shopping_list_items, shopping_lists, recipe_ingredients, recipes RESTART IDENTITY CASCADE',
  );
}
