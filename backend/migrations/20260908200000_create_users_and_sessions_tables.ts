import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('users', {
    id: { type: 'uuid', primaryKey: true },
    email: { type: 'text', notNull: true },
    password_hash: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('users', 'email', { unique: true });

  pgm.createTable('sessions', {
    id: { type: 'uuid', primaryKey: true },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    // SHA-256 of the opaque token sent to the client, not the token itself —
    // a leaked sessions table alone can't be replayed as a valid cookie.
    token_hash: { type: 'text', notNull: true },
    expires_at: { type: 'timestamptz', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('sessions', 'token_hash', { unique: true });

  // Additive ownership columns. Nullable because they're being introduced onto
  // tables that already exist; ON DELETE CASCADE so removing a user removes
  // their recipes and shopping lists rather than leaving orphaned rows with no
  // owner, since there is no account-deletion feature that would need them kept.
  pgm.addColumn('recipes', {
    user_id: { type: 'uuid', references: 'users', onDelete: 'CASCADE' },
  });
  pgm.createIndex('recipes', 'user_id');

  pgm.addColumn('shopping_lists', {
    user_id: { type: 'uuid', references: 'users', onDelete: 'CASCADE' },
  });
  pgm.createIndex('shopping_lists', 'user_id');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn('shopping_lists', 'user_id');
  pgm.dropColumn('recipes', 'user_id');
  pgm.dropTable('sessions');
  pgm.dropTable('users');
}
