import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { requestIdMiddleware } from './middleware/request-id.middleware';
import { requestLogger } from './middleware/logger.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { generalLimiter } from './middleware/rate-limit.middleware';

// Routes
import authRoutes from './modules/auth/auth.routes';
import platformsRoutes from './modules/platforms/platforms.routes';
import campaignsRoutes from './modules/campaigns/campaigns.routes';
import metricsRoutes from './modules/metrics/metrics.routes';
import aiRoutes from './modules/ai/ai.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import adLibraryRoutes from './modules/ad-library/ad-library.routes';
import reportsRoutes from './modules/reports/reports.routes';
import automationRoutes from './modules/automation/automation.routes';
import campaignLibraryRoutes from './modules/campaign-library/campaign-library.routes';
import whatsappRoutes from './modules/whatsapp/whatsapp.routes';
import clientsRoutes from './modules/clients/clients.routes';
import apiLogsRoutes from './modules/api-logs/api-logs.routes';
import audiencesRoutes from './modules/audiences/audiences.routes';
import trackingRoutes from './modules/tracking/tracking.routes';
import { trackingController } from './modules/tracking/tracking.controller';
import { redirectLimiter } from './middleware/rate-limit.middleware';

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HackrAds API',
      version: '1.0.0',
      description: 'API for managing multi-channel advertising campaigns',
    },
    servers: [
      {
        url: env.APP_URL,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/modules/**/*.routes.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

export function createApp(): Application {
  const app = express();

  // Request ID middleware (must be first)
  app.use(requestIdMiddleware);

  // Security middleware
  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    })
  );

  // Body parser middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Custom middleware
  app.use(requestLogger);
  app.use(generalLimiter);

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/platforms', platformsRoutes);
  app.use('/api/campaigns', campaignsRoutes);
  app.use('/api/metrics', metricsRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/ad-library', adLibraryRoutes);
  app.use('/api/reports', reportsRoutes);
  app.use('/api/automation', automationRoutes);
  app.use('/api/campaign-library', campaignLibraryRoutes);
  app.use('/api/whatsapp', whatsappRoutes);
  app.use('/api/clients', clientsRoutes);
  app.use('/api/api-logs', apiLogsRoutes);
  app.use('/api/audiences', audiencesRoutes);
  app.use('/api/tracking', trackingRoutes);

  // Public tracking redirect (before error handlers)
  app.get('/t/:shortCode', redirectLimiter, (req, res) => trackingController.handleRedirect(req, res));

  // Swagger documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Health check
  app.get('/health', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Server is healthy',
      timestamp: new Date().toISOString(),
    });
  });

  // Root endpoint
  app.get('/', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'HackrAds API',
      version: '1.0.0',
      docs: `${env.APP_URL}/api-docs`,
    });
  });

  // Error handlers (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
