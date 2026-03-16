import { Router } from 'express';
import { audiencesController } from './audiences.controller';
import { authenticate } from '../auth/auth.middleware';

const router = Router();

router.get('/', authenticate, (req, res) => audiencesController.list(req, res));
router.post('/', authenticate, (req, res) => audiencesController.create(req, res));
router.get('/platform/:platformId', authenticate, (req, res) => audiencesController.listForPlatform(req, res));
router.get('/:id', authenticate, (req, res) => audiencesController.getById(req, res));
router.put('/:id', authenticate, (req, res) => audiencesController.update(req, res));
router.delete('/:id', authenticate, (req, res) => audiencesController.delete(req, res));
router.post('/:id/refresh', authenticate, (req, res) => audiencesController.refreshSize(req, res));

export default router;
