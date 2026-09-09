import 'dotenv/config';

import { pool } from '../src/db.js';
import { UserNotFoundError, seedRecipesForEmail } from '../src/services/seedRecipesForEmail.js';

async function main(): Promise<void> {
  const emailArg = process.argv.find((arg) => arg.startsWith('--email='));
  const email = emailArg?.slice('--email='.length);

  if (!email) {
    console.error('Usage: npm run seed:recipes -w backend -- --email=<account email>');
    process.exitCode = 1;
    return;
  }

  const result = await seedRecipesForEmail(pool, email);

  if (result.seeded.length === 0) {
    console.log(`${email} already has every default recipe (${result.alreadyPresent.join(', ')}) — nothing to do.`);
    return;
  }

  console.log(`Seeded for ${email}: ${result.seeded.join(', ')}.`);
  if (result.alreadyPresent.length > 0) {
    console.log(`Already present, left alone: ${result.alreadyPresent.join(', ')}.`);
  }
}

main()
  .catch((error) => {
    if (error instanceof UserNotFoundError) {
      console.error(error.message);
    } else {
      console.error('seed:recipes failed', error);
    }
    process.exitCode = 1;
  })
  .finally(() => pool.end());
