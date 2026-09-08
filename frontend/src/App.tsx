import { Route, Routes } from 'react-router-dom';

import { AppLayout } from './components/layout/AppLayout.tsx';
import { AccountPage } from './features/auth/AccountPage.tsx';
import { LoginPage } from './features/auth/LoginPage.tsx';
import { RegisterPage } from './features/auth/RegisterPage.tsx';
import { RequireAuth } from './features/auth/RequireAuth.tsx';
import { HomePage } from './features/home/HomePage.tsx';
import { RecipeBox } from './features/recipes/RecipeBox.tsx';
import { RecipeDetail } from './features/recipes/RecipeDetail.tsx';
import { RecipeForm } from './features/recipes/RecipeForm.tsx';
import { ShoppingList } from './features/shopping-list/ShoppingList.tsx';
import { DesignSystemPage } from './pages/DesignSystemPage.tsx';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route
          path="/"
          element={
            <RequireAuth>
              <HomePage />
            </RequireAuth>
          }
        />
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
      </Route>
    </Routes>
  );
}
