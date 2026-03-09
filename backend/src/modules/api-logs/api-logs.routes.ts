import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../auth/auth.middleware';
import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';

const router = Router();

router.use(authenticate);

// GET /api/api-logs - List API logs with pagination and filters
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const platformType = req.query.platformType as string | undefined;
    const statusCode = req.query.statusCode ? Number(req.query.statusCode) : undefined;

    const where: any = { userId: req.user.userId };
    if (platformType) where.platformType = platformType;
    if (statusCode) where.responseStatus = statusCode;

    const [logs, total] = await Promise.all([
      prisma.apiLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.apiLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
    logger.error('List API logs error:', error);
    res.status(500).json({ success: false, error: error.message || 'Internal error' });
  }
});

export default router;
