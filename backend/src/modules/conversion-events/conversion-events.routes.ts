import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware';
import { conversionEventsController } from './conversion-events.controller';

const router = Router();

router.use(authenticate);

router.get('/', (req, res) => conversionEventsController.list(req, res));
router.post('/', (req, res) => conversionEventsController.create(req, res));
router.put('/:id', (req, res) => conversionEventsController.update(req, res));
router.delete('/:id', (req, res) => conversionEventsController.delete(req, res));
router.post('/:id/test', (req, res) => conversionEventsController.test(req, res));

export default router;
