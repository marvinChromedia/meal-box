import type { RecipeInput } from '@recipe-box/shared';

// TEST-254: seeded into every new account's recipe box at signup. Written
// directly for this ticket — not copied from any specific site — so a
// brand-new account has something real to look at instead of an empty box.
export const DEFAULT_RECIPES: RecipeInput[] = [
  {
    title: 'Chicken Adobo',
    tags: ['chicken', 'filipino'],
    ingredients: [
      { name: 'Chicken thighs', quantity: 1, unit: 'kg' },
      { name: 'Soy sauce', quantity: 0.5, unit: 'cup' },
      { name: 'White vinegar', quantity: 0.33, unit: 'cup' },
      { name: 'Garlic, minced', quantity: 6, unit: 'cloves' },
      { name: 'Bay leaves', quantity: 2, unit: 'pieces' },
      { name: 'Whole peppercorns', quantity: 1, unit: 'tsp' },
      { name: 'Brown sugar', quantity: 1, unit: 'tbsp' },
      { name: 'Cooking oil', quantity: 2, unit: 'tbsp' },
      { name: 'Water', quantity: 1, unit: 'cup' },
    ],
    steps: [
      'Combine the chicken, soy sauce, vinegar, garlic, bay leaves, and peppercorns in a bowl; marinate for at least 30 minutes.',
      'Heat the oil in a pot over medium heat and sear the chicken until lightly browned, reserving the marinade.',
      'Pour in the reserved marinade and water; bring to a boil, then reduce the heat and simmer uncovered for 30 minutes.',
      'Stir in the brown sugar and continue simmering until the sauce thickens and the chicken is tender, about 10 more minutes.',
      'Taste and adjust with extra soy sauce or vinegar if needed, then serve hot with rice.',
    ],
  },
  {
    title: 'Pancit Canton',
    tags: ['noodles', 'filipino'],
    ingredients: [
      { name: 'Pancit canton noodles', quantity: 8, unit: 'oz' },
      { name: 'Chicken breast, sliced thin', quantity: 0.5, unit: 'lb' },
      { name: 'Shrimp, peeled', quantity: 0.25, unit: 'lb' },
      { name: 'Cabbage, shredded', quantity: 2, unit: 'cups' },
      { name: 'Carrot, julienned', quantity: 1, unit: 'cup' },
      { name: 'Snap peas', quantity: 1, unit: 'cup' },
      { name: 'Garlic, minced', quantity: 4, unit: 'cloves' },
      { name: 'Onion, sliced', quantity: 1, unit: 'piece' },
      { name: 'Soy sauce', quantity: 3, unit: 'tbsp' },
      { name: 'Oyster sauce', quantity: 2, unit: 'tbsp' },
      { name: 'Chicken broth', quantity: 1.5, unit: 'cups' },
      { name: 'Cooking oil', quantity: 3, unit: 'tbsp' },
    ],
    steps: [
      'Soak the pancit canton noodles in warm water for a few minutes until pliable, then drain.',
      'Heat the oil in a wok over medium-high heat and sauté the garlic and onion until fragrant.',
      'Add the chicken and shrimp, cooking until the chicken is no longer pink.',
      'Add the carrot and cabbage, stir-frying for 2 minutes, then pour in the chicken broth, soy sauce, and oyster sauce.',
      'Bring to a simmer, then add the drained noodles, tossing to coat and absorb the liquid.',
      'Add the snap peas during the last minute of cooking, then serve.',
    ],
  },
  {
    title: 'Garlic Fried Rice',
    tags: ['rice', 'side dish', 'filipino'],
    ingredients: [
      { name: 'Cooked rice, day-old', quantity: 4, unit: 'cups' },
      { name: 'Garlic, minced', quantity: 8, unit: 'cloves' },
      { name: 'Cooking oil', quantity: 3, unit: 'tbsp' },
      { name: 'Salt', quantity: 1, unit: 'tsp' },
      { name: 'Green onions, chopped', quantity: 2, unit: 'stalks' },
    ],
    steps: [
      'Heat the oil in a large pan or wok over medium heat and add the minced garlic.',
      'Cook the garlic slowly, stirring often, until golden and crisp; scoop out about half of it and set aside for topping.',
      'Add the day-old rice to the remaining garlic and oil, breaking up any clumps.',
      'Stir-fry the rice for 3 to 4 minutes until heated through and lightly toasted, seasoning with the salt.',
      'Serve topped with the reserved crispy garlic and the green onions.',
    ],
  },
];
