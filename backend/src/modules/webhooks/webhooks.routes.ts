import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware';
import { webhooksController } from './webhooks.controller';

const router = Router();

router.use(authenticate);

router.get('/', (req, res) => webhooksController.list(req, res));
router.post('/', (req, res) => webhooksController.create(req, res));
router.put('/:id', (req, res) => webhooksController.update(req, res));
router.delete('/:id', (req, res) => webhooksController.delete(req, res));
router.post('/:id/test', (req, res) => webhooksController.test(req, res));
router.get('/:id/deliveries', (req, res) => webhooksController.deliveries(req, res));

export default router;
