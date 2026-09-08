export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

/**
 * "http" is the default now that the recipe (TEST-72) and shopping-list
 * (TEST-76, TEST-234) endpoints both exist — see feature api.ts files for the
 * mock/http split this flag selects between. Set VITE_API_MODE=mock locally
 * to build a screen ahead of endpoints it needs that don't exist yet.
 */
export const API_MODE: 'mock' | 'http' = import.meta.env.VITE_API_MODE === 'mock' ? 'mock' : 'http';
