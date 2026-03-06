import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log: [
      {
        emit: 'event',
        level: 'query',
      },
      {
        emit: 'event',
        level: 'error',
      },
      {
        emit: 'event',
        level: 'warn',
      },
    ],
  });

  // BigInt serialization middleware - auto-convert BigInt to Number
  client.$use(async (params, next) => {
    const result = await next(params);
    return convertBigIntToNumber(result);
  });

  return client;
};

/**
 * Recursively convert BigInt values to Number in query results.
 * This prevents "Do not know how to serialize a BigInt" JSON errors.
 */
function convertBigIntToNumber(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data === 'bigint') return Number(data);
  if (Array.isArray(data)) return data.map(convertBigIntToNumber);
  if (typeof data === 'object' && !(data instanceof Date)) {
    const converted: any = {};
    for (const key of Object.keys(data)) {
      converted[key] = convertBigIntToNumber(data[key]);
    }
    return converted;
  }
  return data;
}

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

// Log queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug(`Query: ${e.query}`);
    logger.debug(`Duration: ${e.duration}ms`);
  });
}

prisma.$on('error', (e) => {
  logger.error('Prisma error:', e);
});

prisma.$on('warn', (e) => {
  logger.warn('Prisma warning:', e);
});

export { prisma };
