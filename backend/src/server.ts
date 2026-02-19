import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { prisma } from './config/database';
import { redis } from './config/redis';

// Import jobs
import './jobs/sync-campaigns.job';

const app = createApp();

// Start server
const server = app.listen(env.PORT, () => {
  logger.info(`
    ╔══════════════════════════════════════════════════════════╗
    ║                                                          ║
    ║         Multi Ads Platform API - v1.0.0                 ║
    ║                                                          ║
    ║  Server running on: ${env.APP_URL.padEnd(30)} ║
    ║  Environment: ${env.NODE_ENV.padEnd(40)} ║
    ║  Docs: ${(env.APP_URL + '/api-docs').padEnd(45)} ║
    ║                                                          ║
    ╚══════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP server closed');

    // Close database connection
    await prisma.$disconnect();
    logger.info('Database connection closed');

    // Close Redis connection
    redis.disconnect();
    logger.info('Redis connection closed');

    logger.info('Graceful shutdown completed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});
