import type { NextFunction, Request, Response } from 'express';

import { sendError } from '../http/errors.js';

// AC6: another account's record id returns 404, never 403 — existence of a
// record you don't own is not disclosed. Must run after requireAuth, which
// populates req.user.
//
// getOwnerId resolves the record's owner id (e.g. by loading it and reading
// its user_id column), or null if no record with that id exists at all.
export function requireOwner(getOwnerId: (req: Request) => Promise<string | null>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ownerId = await getOwnerId(req);
    if (ownerId === null || ownerId !== req.user?.id) {
      sendError(res, 404, 'not found', 'NOT_FOUND');
      return;
    }
    next();
  };
}
