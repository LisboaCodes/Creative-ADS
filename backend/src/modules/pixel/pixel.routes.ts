import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware';
import { pixelController } from './pixel.controller';

const router = Router();

router.use(authenticate);

router.get('/', (req, res) => pixelController.list(req, res));
router.post('/', (req, res) => pixelController.create(req, res));
router.put('/:id', (req, res) => pixelController.update(req, res));
router.delete('/:id', (req, res) => pixelController.delete(req, res));
router.post('/:id/test', (req, res) => pixelController.test(req, res));

export default router;
