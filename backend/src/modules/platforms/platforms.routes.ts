import { Router } from 'express';
import { platformsController } from './platforms.controller';
import { authenticate } from '../auth/auth.middleware';

const router = Router();

// Get all user platforms
router.get('/', authenticate, (req, res) =>
  platformsController.getUserPlatforms(req, res)
);

// Get OAuth URL
router.get('/:type/connect', authenticate, (req, res) =>
  platformsController.getAuthUrl(req, res)
);

// OAuth callback
router.get('/:type/callback', (req, res) =>
  platformsController.handleCallback(req, res)
);

// Disconnect platform
router.delete('/:id', authenticate, (req, res) =>
  platformsController.disconnectPlatform(req, res)
);

// Sync platform campaigns
router.post('/:id/sync', authenticate, (req, res) =>
  platformsController.syncPlatform(req, res)
);

export default router;
