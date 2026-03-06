import { Router } from 'express';
import { platformsController } from './platforms.controller';
import { authenticate } from '../auth/auth.middleware';

const router = Router();

// Get all user platforms
router.get('/', authenticate, (req, res) =>
  platformsController.getUserPlatforms(req, res)
);

// --- Platform Logins (multiple Facebook accounts) ---
// These must come before /:type and /:id routes to avoid conflicts

// Get all platform logins
router.get('/logins', authenticate, (req, res) =>
  platformsController.getPlatformLogins(req, res)
);

// Re-sync a login (rediscover BMs/accounts)
router.post('/logins/:loginId/sync', authenticate, (req, res) =>
  platformsController.resyncLogin(req, res)
);

// Disconnect a login + all associated accounts
router.delete('/logins/:loginId', authenticate, (req, res) =>
  platformsController.disconnectLogin(req, res)
);

// --- Business Manager ---

// Get BM detail (ad accounts, pages, pixels)
router.get('/bm/:bmId', authenticate, (req, res) =>
  platformsController.getBMDetail(req, res)
);

// --- Existing routes ---

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

// Get pages for platform
router.get('/:id/pages', authenticate, (req, res) =>
  platformsController.getPages(req, res)
);

// Get posts for a page
router.get('/:id/pages/:pageId/posts', authenticate, (req, res) =>
  platformsController.getPagePosts(req, res)
);

// Get pixel info for platform
router.get('/:id/pixels', authenticate, (req, res) =>
  platformsController.getPixels(req, res)
);

// Sync platform campaigns
router.post('/:id/sync', authenticate, (req, res) =>
  platformsController.syncPlatform(req, res)
);

export default router;
