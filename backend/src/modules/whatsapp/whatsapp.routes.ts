import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware';
import { whatsAppController } from './whatsapp.controller';

const router = Router();

// All WhatsApp routes require authentication
router.use(authenticate);

router.get('/status', (req, res, next) => whatsAppController.getStatus(req, res, next));
router.get('/groups', (req, res, next) => whatsAppController.getGroups(req, res, next));
router.post('/groups', (req, res, next) => whatsAppController.createGroup(req, res, next));
router.put('/groups/:id', (req, res, next) => whatsAppController.updateGroup(req, res, next));
router.delete('/groups/:id', (req, res, next) => whatsAppController.deleteGroup(req, res, next));
router.get('/available-groups', (req, res, next) => whatsAppController.getAvailableGroups(req, res, next));
router.post('/groups/:id/test', (req, res, next) => whatsAppController.sendTestMessage(req, res, next));

export default router;
