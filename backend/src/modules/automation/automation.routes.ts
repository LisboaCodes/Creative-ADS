import { Router } from 'express';
import { automationController } from './automation.controller';
import { authenticate } from '../auth/auth.middleware';

const router = Router();

router.get('/', authenticate, (req, res) => automationController.getRules(req, res));
router.post('/', authenticate, (req, res) => automationController.createRule(req, res));
router.patch('/:id', authenticate, (req, res) => automationController.updateRule(req, res));
router.delete('/:id', authenticate, (req, res) => automationController.deleteRule(req, res));

export default router;
