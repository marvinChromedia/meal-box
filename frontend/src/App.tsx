import { Link, Route, Routes } from 'react-router-dom';

import { RecipeBox } from './features/recipes/RecipeBox.tsx';
import { RecipeDetail } from './features/recipes/RecipeDetail.tsx';
import { RecipeForm } from './features/recipes/RecipeForm.tsx';
import { ShoppingList } from './features/shopping-list/ShoppingList.tsx';
import { DesignSystemPage } from './pages/DesignSystemPage.tsx';

function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-3xl font-bold text-gray-900">Recipe Box</h1>
      <p className="text-gray-600">Save recipes, generate a shopping list from them.</p>
      <Link to="/recipes" className="text-sm font-medium text-blue-600 hover:underline">
        Go to your recipe box &rarr;
      </Link>
      <Link to="/shopping-list" className="text-sm font-medium text-blue-600 hover:underline">
        Go to your shopping list &rarr;
      </Link>
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
      <Route path="/recipes" element={<RecipeBox />} />
      <Route path="/recipes/new" element={<RecipeForm />} />
      <Route path="/recipes/:id" element={<RecipeDetail />} />
      <Route path="/recipes/:id/edit" element={<RecipeForm />} />
      <Route path="/shopping-list" element={<ShoppingList />} />
      <Route path="/design" element={<DesignSystemPage />} />
    </Routes>
  );
}
