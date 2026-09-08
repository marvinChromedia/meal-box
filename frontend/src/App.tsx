import { Link, Route, Routes } from 'react-router-dom';

import { AccountPage } from './features/auth/AccountPage.tsx';
import { LoginPage } from './features/auth/LoginPage.tsx';
import { RegisterPage } from './features/auth/RegisterPage.tsx';
import { RequireAuth } from './features/auth/RequireAuth.tsx';
import { useCurrentUser } from './features/auth/hooks.ts';
import { RecipeBox } from './features/recipes/RecipeBox.tsx';
import { RecipeDetail } from './features/recipes/RecipeDetail.tsx';
import { RecipeForm } from './features/recipes/RecipeForm.tsx';
import { ShoppingList } from './features/shopping-list/ShoppingList.tsx';
import { DesignSystemPage } from './pages/DesignSystemPage.tsx';

function HomePage() {
  const { data: user, isLoading } = useCurrentUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-3xl font-bold text-gray-900">Recipe Box</h1>
      <p className="text-gray-600">Save recipes, generate a shopping list from them.</p>

      {!isLoading && user ? (
        <div className="flex items-center gap-4 text-sm font-medium">
          <Link to="/recipes" className="text-blue-600 hover:underline">
            Go to your recipe box &rarr;
          </Link>
          <Link to="/shopping-list" className="text-blue-600 hover:underline">
            Go to your shopping list &rarr;
          </Link>
          <Link to="/account" className="text-blue-600 hover:underline">
            Signed in as {user.email}
          </Link>
        </div>
      ) : !isLoading ? (
        <div className="flex items-center gap-4 text-sm font-medium">
          <Link to="/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>
          <Link to="/register" className="text-blue-600 hover:underline">
            Register
          </Link>
        </div>
      ) : null}

      <Link to="/design" className="text-sm font-medium text-blue-600 hover:underline">
        View design system &rarr;
      </Link>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route
        path="/recipes"
        element={
          <RequireAuth>
            <RecipeBox />
          </RequireAuth>
        }
      />
      <Route
        path="/recipes/new"
        element={
          <RequireAuth>
            <RecipeForm />
          </RequireAuth>
        }
      />
      <Route
        path="/recipes/:id"
        element={
          <RequireAuth>
            <RecipeDetail />
          </RequireAuth>
        }
      />
      <Route
        path="/recipes/:id/edit"
        element={
          <RequireAuth>
            <RecipeForm />
          </RequireAuth>
        }
      />
      <Route
        path="/shopping-list"
        element={
          <RequireAuth>
            <ShoppingList />
          </RequireAuth>
        }
      />
      <Route path="/design" element={<DesignSystemPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/account"
        element={
          <RequireAuth>
            <AccountPage />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
