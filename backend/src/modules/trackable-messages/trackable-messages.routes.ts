import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware';
import { trackableMessagesController } from './trackable-messages.controller';

const router = Router();

router.use(authenticate);

router.get('/', (req, res) => trackableMessagesController.list(req, res));
router.post('/', (req, res) => trackableMessagesController.create(req, res));
router.put('/:id', (req, res) => trackableMessagesController.update(req, res));
router.delete('/:id', (req, res) => trackableMessagesController.delete(req, res));

export default router;
