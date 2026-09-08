import { Link } from 'react-router-dom';

import { useCurrentUser } from '../features/auth/hooks.ts';

// TEST-250 replaces this with the real landing screen once TEST-248 and
// TEST-249 have both merged. Until then, this ticket only adapts it to the
// shared shell (drops its own <main>) and removes the design-system link
// per AC — the content itself is out of scope here.
export function HomePage() {
  const { data: user, isLoading } = useCurrentUser();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 text-center">
      <h1 className="font-display text-3xl font-bold text-ink">MealBox</h1>
      <p className="text-ink-muted">Save recipes, generate a shopping list from them.</p>

      {!isLoading && user ? (
        <div className="flex items-center gap-4 text-sm font-medium">
          <Link to="/recipes" className="text-accent hover:underline">
            Go to your recipe box &rarr;
          </Link>
          <Link to="/shopping-list" className="text-accent hover:underline">
            Go to your shopping list &rarr;
          </Link>
          <Link to="/account" className="text-accent hover:underline">
            Signed in as {user.email}
          </Link>
        </div>
      ) : !isLoading ? (
        <div className="flex items-center gap-4 text-sm font-medium">
          <Link to="/login" className="text-accent hover:underline">
            Sign in
          </Link>
          <Link to="/register" className="text-accent hover:underline">
            Register
          </Link>
        </div>
      ) : null}
    </div>
  );
}
