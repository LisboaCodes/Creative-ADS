import { Router } from 'express';
import { platformsController } from './platforms.controller';
import { authenticate } from '../auth/auth.middleware';
import { metaWebhookController } from './meta-webhook.controller';
import { platformWebhookLimiter } from '../../middleware/rate-limit.middleware';

const router = Router();

// Meta webhooks (Instagram DM / Messenger) - public, BEFORE auth routes
router.get('/meta/webhook', (req, res) => metaWebhookController.verify(req, res));
router.post('/meta/webhook', platformWebhookLimiter, (req, res) => metaWebhookController.handleEvent(req, res));

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

// Sync all connected platforms
router.post('/sync-all', authenticate, (req, res) =>
  platformsController.syncAllPlatforms(req, res)
);

// --- Business Manager ---

// Get BM billing/financial data (more specific path first)
router.get('/bm/:bmId/billing', authenticate, (req, res) =>
  platformsController.getBMBilling(req, res)
);

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
