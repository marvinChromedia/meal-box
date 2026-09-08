import { Outlet } from 'react-router-dom';

import { Header } from './Header.tsx';

// The one <main> in the app (TEST-249 AC1/AC3) — every route renders inside
// it via <Outlet/>. Screens keep their own max-width (a recipe list and an
// auth card don't want the same one) but no longer declare their own <main>
// or repeat this padding/vertical rhythm.
export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
