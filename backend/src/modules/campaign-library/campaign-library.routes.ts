import { Router } from 'express';
import { campaignLibraryController } from './campaign-library.controller';

const router = Router();

// Public routes (no auth required - it's a reference library)
router.get('/overview', (req, res) => campaignLibraryController.getOverview(req, res));
router.get('/', (req, res) => campaignLibraryController.getTemplates(req, res));
router.get('/:id', (req, res) => campaignLibraryController.getTemplateById(req, res));

export default router;
