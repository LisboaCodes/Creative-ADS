import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware';
import { journeyController } from './journey.controller';

const router = Router();

router.use(authenticate);

router.get('/stages', (req, res) => journeyController.listStages(req, res));
router.post('/stages', (req, res) => journeyController.createStage(req, res));
router.put('/stages/reorder', (req, res) => journeyController.reorderStages(req, res));
router.put('/stages/:id', (req, res) => journeyController.updateStage(req, res));
router.delete('/stages/:id', (req, res) => journeyController.deleteStage(req, res));
router.post('/leads/:leadId/move', (req, res) => journeyController.moveLeadToStage(req, res));

export default router;
