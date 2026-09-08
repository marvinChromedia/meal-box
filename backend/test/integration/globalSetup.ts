import { Client } from 'pg';

export default async function setup(): Promise<void> {
  const databaseUrl = process.env.TEST_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'TEST_DATABASE_URL must be set to run integration tests (see backend/.env.example)',
    );
  }
  if (databaseUrl === process.env.DATABASE_URL) {
    throw new Error(
      'TEST_DATABASE_URL must not be the same as DATABASE_URL — integration tests truncate and reseed the database they run against',
    );
  }

  // Reset to a clean schema so AC5 (migrations are repeatable from scratch) is
  // exercised on every test run, not just assumed.
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query('DROP SCHEMA public CASCADE');
    await client.query('CREATE SCHEMA public');
  } finally {
    await client.end();
  }

  const { register } = await import('tsx/esm/api');
  const unregister = register();
  try {
    const { default: runMigrations } = await import('node-pg-migrate');
    await runMigrations({
      databaseUrl,
      dir: new URL('../../migrations', import.meta.url).pathname,
      direction: 'up',
      migrationsTable: 'pgmigrations',
      logger: { info: () => {}, warn: console.warn, error: console.error },
    });
  } finally {
    unregister();
  }
}
