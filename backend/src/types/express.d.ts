import type { User } from '@mealbox/shared';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export {};
