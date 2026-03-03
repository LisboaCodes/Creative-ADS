import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware';
import { aiController } from './ai.controller';

const router = Router();

// All AI routes require authentication
router.use(authenticate);

// Chat
router.post('/chat', (req, res) => aiController.chat(req, res));

// Conversations
router.get('/conversations', (req, res) => aiController.getConversations(req, res));
router.get('/conversations/:id', (req, res) => aiController.getConversation(req, res));

// Actions
router.get('/actions/pending', (req, res) => aiController.getPendingActions(req, res));
router.post('/actions/bulk-approve', (req, res) => aiController.bulkApprove(req, res));
router.post('/actions/:id/approve', (req, res) => aiController.approveAction(req, res));
router.post('/actions/:id/reject', (req, res) => aiController.rejectAction(req, res));

export default router;
