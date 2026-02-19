import { Router } from 'express';
import { campaignsController } from './campaigns.controller';
import { authenticate } from '../auth/auth.middleware';

const router = Router();

// Get all campaigns
router.get('/', authenticate, (req, res) =>
  campaignsController.getCampaigns(req, res)
);

// Get campaign by ID
router.get('/:id', authenticate, (req, res) =>
  campaignsController.getCampaignById(req, res)
);

// Update campaign status
router.patch('/:id/status', authenticate, (req, res) =>
  campaignsController.updateStatus(req, res)
);

// Update campaign budget
router.patch('/:id/budget', authenticate, (req, res) =>
  campaignsController.updateBudget(req, res)
);

// Bulk action
router.post('/bulk-action', authenticate, (req, res) =>
  campaignsController.bulkAction(req, res)
);

export default router;
