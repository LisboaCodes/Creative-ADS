import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware';
import { reportsController } from './reports.controller';

const router = Router();

// All report routes require authentication
router.use(authenticate);

// Generate a new report
router.post('/', (req, res) => reportsController.generate(req, res));

// List all reports
router.get('/', (req, res) => reportsController.list(req, res));

// Get a specific report
router.get('/:id', (req, res) => reportsController.getById(req, res));

// Delete a report
router.delete('/:id', (req, res) => reportsController.delete(req, res));

// Get report as HTML
router.get('/:id/html', (req, res) => reportsController.getHtml(req, res));

// Download report as CSV
router.get('/:id/csv', (req, res) => reportsController.getCsv(req, res));

export default router;
