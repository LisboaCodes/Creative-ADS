import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware';
import { clientsController } from './clients.controller';

const router = Router();

router.use(authenticate);

router.get('/', (req, res) => clientsController.list(req, res));
router.post('/', (req, res) => clientsController.create(req, res));
router.get('/:id', (req, res) => clientsController.getById(req, res));
router.put('/:id', (req, res) => clientsController.update(req, res));
router.delete('/:id', (req, res) => clientsController.delete(req, res));

export default router;
