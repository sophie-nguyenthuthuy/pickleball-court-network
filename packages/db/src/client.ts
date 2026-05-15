import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __pcnPrisma: PrismaClient | undefined;
}

export type { PrismaClient } from '@prisma/client';

export const prisma: PrismaClient =
  globalThis.__pcnPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__pcnPrisma = prisma;
}
