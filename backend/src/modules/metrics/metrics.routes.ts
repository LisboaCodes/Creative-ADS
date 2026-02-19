import { Router } from 'express';
import { metricsController } from './metrics.controller';
import { authenticate } from '../auth/auth.middleware';

const router = Router();

// Get overview metrics
router.get('/overview', authenticate, (req, res) =>
  metricsController.getOverview(req, res)
);

// Get campaign metrics
router.get('/campaign/:id', authenticate, (req, res) =>
  metricsController.getCampaignMetrics(req, res)
);

// Get metrics by platform
router.get('/by-platform', authenticate, (req, res) =>
  metricsController.getByPlatform(req, res)
);

// Get time series metrics
router.get('/time-series', authenticate, (req, res) =>
  metricsController.getTimeSeries(req, res)
);

export default router;
