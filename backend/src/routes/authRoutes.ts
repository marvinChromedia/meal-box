import { Router } from 'express';
import type { Pool } from 'pg';

import { createAuthController } from '../controllers/authController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody } from '../middleware/validate.js';
import { credentialsRequestSchema } from '../schemas/authSchemas.js';

export function authRoutes(pool: Pool): Router {
  const router = Router();
  const controller = createAuthController(pool);

  router.post(
    '/register',
    validateBody(credentialsRequestSchema),
    asyncHandler(controller.register),
  );
  router.post('/login', validateBody(credentialsRequestSchema), asyncHandler(controller.login));
  router.post('/logout', asyncHandler(controller.logout));
  router.get('/me', requireAuth(pool), (req, res) => {
    controller.me(req, res);
  });

  return router;
}
