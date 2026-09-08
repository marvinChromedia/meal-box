import type { User } from '@recipe-box/shared';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export {};
