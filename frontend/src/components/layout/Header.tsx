import { clsx } from 'clsx';
import { Link, NavLink, useNavigate } from 'react-router-dom';

import { useCurrentUser, useSignOut } from '../../features/auth/hooks.ts';
import { Button } from '../ui/Button.tsx';

function navLinkClassName({ isActive }: { isActive: boolean }) {
  return clsx(
    'rounded-md px-3 py-2 text-sm font-medium',
    isActive ? 'bg-line text-ink' : 'text-ink-muted hover:bg-ground hover:text-ink',
  );
}

// Signed-in and signed-out are both real states here (TEST-249 AC4) — the
// login/register pages render through this same header, so it must never
// show navigation into guarded screens or a sign-out control to someone who
// isn't signed in. `isLoading` (the moment before either is known) shows
// neither, matching what the old home page already did.
export function Header() {
  const { data: user, isLoading } = useCurrentUser();
  const signOut = useSignOut();
  const navigate = useNavigate();
  const signedIn = !isLoading && !!user;

  function handleSignOut() {
    signOut.mutate(undefined, {
      onSuccess: () => navigate('/login', { state: { justSignedOut: true } }),
    });
  }

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="font-display text-lg font-semibold text-ink">
          MealBox
        </Link>

        {signedIn ? (
          <nav aria-label="Main" className="flex items-center gap-1">
            <NavLink to="/recipes" className={navLinkClassName}>
              Recipe Box
            </NavLink>
            <NavLink to="/shopping-list" className={navLinkClassName}>
              Shopping List
            </NavLink>
          </nav>
        ) : null}

        {signedIn ? (
          <div className="flex items-center gap-3 text-sm">
            <Link to="/account" className="text-ink-muted hover:text-ink">
              {user.email}
            </Link>
            <Button variant="outline" size="sm" onClick={handleSignOut} disabled={signOut.isPending}>
              {signOut.isPending ? 'Signing out…' : 'Sign out'}
            </Button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
