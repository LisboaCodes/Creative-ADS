import { Response } from 'express';
import { ZodError } from 'zod';
import { AuthRequest } from '../auth/auth.middleware';
import { clientsService } from './clients.service';
import { createClientSchema, updateClientSchema } from './clients.schemas';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';

export class ClientsController {
  async list(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const clients = await clientsService.getClients(req.user.userId);
      res.json({ success: true, data: clients });
    } catch (error: any) {
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('List clients error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async getById(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const client = await clientsService.getClientById(req.params.id, req.user.userId);
      res.json({ success: true, data: client });
    } catch (error: any) {
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('Get client error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const input = createClientSchema.parse(req.body);
      const client = await clientsService.createClient(req.user.userId, input);
      res.status(201).json({ success: true, data: client });
    } catch (error: any) {
      if (error instanceof ZodError) return res.status(422).json({ success: false, error: error.errors });
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('Create client error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const input = updateClientSchema.parse(req.body);
      const client = await clientsService.updateClient(req.params.id, req.user.userId, input);
      res.json({ success: true, data: client });
    } catch (error: any) {
      if (error instanceof ZodError) return res.status(422).json({ success: false, error: error.errors });
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('Update client error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      await clientsService.deleteClient(req.params.id, req.user.userId);
      res.json({ success: true, data: { deleted: true } });
    } catch (error: any) {
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('Delete client error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }
}

export const clientsController = new ClientsController();
