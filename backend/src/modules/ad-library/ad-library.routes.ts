import { Router } from 'express';
import { adLibraryController } from './ad-library.controller';
import { authenticate } from '../auth/auth.middleware';

const router = Router();

// Search Ad Library
router.get('/search', authenticate, (req, res) =>
  adLibraryController.search(req, res)
);

export default router;
