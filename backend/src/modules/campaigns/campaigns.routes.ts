import { Router } from 'express';
import { campaignsController } from './campaigns.controller';
import { authenticate } from '../auth/auth.middleware';

const router = Router();

// Create campaign
router.post('/', authenticate, (req, res) =>
  campaignsController.createCampaign(req, res)
);

// Apply template (before :id routes)
router.post('/apply-template', authenticate, (req, res) =>
  campaignsController.applyTemplate(req, res)
);

// Upload ad image
router.post('/upload-image', authenticate, (req, res) =>
  campaignsController.uploadImage(req, res)
);

// AI suggest (contextual suggestions)
router.post('/ai-suggest', authenticate, (req, res) =>
  campaignsController.aiSuggest(req, res)
);

// Search targeting options
router.get('/targeting/search', authenticate, (req, res) =>
  campaignsController.searchTargeting(req, res)
);

// Ad Sets listing
router.get('/adsets', authenticate, (req, res) =>
  campaignsController.getAdSets(req, res)
);

// Ads listing
router.get('/ads', authenticate, (req, res) =>
  campaignsController.getAds(req, res)
);

// Get all campaigns
router.get('/', authenticate, (req, res) =>
  campaignsController.getCampaigns(req, res)
);

// Forecast
router.get('/forecast', authenticate, (req, res) => campaignsController.getForecast(req, res));

// Proactive AI insights
router.get('/insights', authenticate, (req, res) => campaignsController.getProactiveInsights(req, res));

// Audit log
router.get('/audit-log', authenticate, (req, res) => campaignsController.getAuditLog(req, res));

// Bulk action (must be before /:id routes)
router.post('/bulk-action', authenticate, (req, res) =>
  campaignsController.bulkAction(req, res)
);

// Duplicate campaign to another platform/BM (before /:id routes)
router.post('/:id/duplicate', authenticate, (req, res) =>
  campaignsController.duplicateCampaign(req, res)
);

// Get campaign by ID
router.get('/:id', authenticate, (req, res) =>
  campaignsController.getCampaignById(req, res)
);

// Draft operations
router.post('/:id/publish', authenticate, (req, res) => campaignsController.publishDraft(req, res));
router.put('/:id/draft', authenticate, (req, res) => campaignsController.updateDraft(req, res));

// Send client update via WhatsApp
router.post('/:id/send-client-update', authenticate, (req, res) => campaignsController.sendClientUpdate(req, res));

// Tags
router.post('/:id/tags', authenticate, (req, res) => campaignsController.addTag(req, res));
router.delete('/:id/tags/:tagId', authenticate, (req, res) => campaignsController.removeTag(req, res));

// Update campaign status
router.patch('/:id/status', authenticate, (req, res) =>
  campaignsController.updateStatus(req, res)
);

// Update campaign budget
router.patch('/:id/budget', authenticate, (req, res) =>
  campaignsController.updateBudget(req, res)
);

export default router;
