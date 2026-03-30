import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware';
import { trackingController } from './tracking.controller';
import { trackingWebhookLimiter } from '../../middleware/rate-limit.middleware';

const router = Router();

// Public routes
router.post('/webhook', trackingWebhookLimiter, (req, res) => trackingController.webhookCapture(req, res));

// Authenticated routes
router.use(authenticate);

// Tracking Links
router.get('/links', (req, res) => trackingController.listLinks(req, res));
router.post('/links', (req, res) => trackingController.createLink(req, res));
router.get('/links/:id', (req, res) => trackingController.getLinkById(req, res));
router.put('/links/:id', (req, res) => trackingController.updateLink(req, res));
router.delete('/links/:id', (req, res) => trackingController.deleteLink(req, res));

// Leads
router.get('/leads', (req, res) => trackingController.listLeads(req, res));
router.post('/leads', (req, res) => trackingController.createLead(req, res));
router.get('/leads/:id', (req, res) => trackingController.getLeadById(req, res));
router.put('/leads/:id', (req, res) => trackingController.updateLead(req, res));
router.delete('/leads/:id', (req, res) => trackingController.deleteLead(req, res));

// Dashboard
router.get('/dashboard', (req, res) => trackingController.getDashboard(req, res));

// API Key
router.get('/api-key', (req, res) => trackingController.getApiKey(req, res));
router.post('/api-key/regenerate', (req, res) => trackingController.regenerateApiKey(req, res));

export default router;
