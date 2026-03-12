import { Router } from 'express';
import { automationController } from './automation.controller';
import { authenticate } from '../auth/auth.middleware';

const router = Router();

// Rules
router.get('/', authenticate, (req, res) => automationController.getRules(req, res));
router.post('/', authenticate, (req, res) => automationController.createRule(req, res));
router.patch('/:id', authenticate, (req, res) => automationController.updateRule(req, res));
router.delete('/:id', authenticate, (req, res) => automationController.deleteRule(req, res));

// Budget Caps (F7)
router.get('/budget-caps', authenticate, (req, res) => automationController.getBudgetCaps(req, res));
router.post('/budget-caps', authenticate, (req, res) => automationController.upsertBudgetCap(req, res));
router.delete('/budget-caps/:id', authenticate, (req, res) => automationController.deleteBudgetCap(req, res));

// A/B Tests (F2)
router.get('/ab-tests', authenticate, (req, res) => automationController.getABTests(req, res));
router.post('/ab-tests', authenticate, (req, res) => automationController.createABTest(req, res));
router.patch('/ab-tests/:id/cancel', authenticate, (req, res) => automationController.cancelABTest(req, res));

// Cross-Platform Duplication (F9)
router.post('/duplicate-campaign', authenticate, (req, res) => automationController.duplicateCampaign(req, res));

export default router;
