export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

/**
 * "mock" is the default so screen tickets can build against this client before
 * the backend endpoints (TEST-72/76) exist — see feature api.ts files for the
 * mock/http split this flag selects between.
 */
export const API_MODE: 'mock' | 'http' = import.meta.env.VITE_API_MODE === 'http' ? 'http' : 'mock';
