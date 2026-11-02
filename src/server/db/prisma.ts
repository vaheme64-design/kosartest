import { PrismaClient } from '@prisma/client';

/**
 * KPIMS Database Connection Configuration
 * Singleton Prisma Client with lazy connection & status checks
 */

declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

export const isDatabaseUrlConfigured = (): boolean => {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
};

export const getPrismaClient = (): PrismaClient => {
  if (!global.__prismaClient) {
    const client = new PrismaClient({
      log: [
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });

    // Intercept Prisma connection events to gracefully handle remote socket closures
    // (e.g. remote host idle timeout, Cloud SQL scale-to-zero) without dumping unhandled errors
    (client as any).$on('error', (e: any) => {
      const msg = String(e?.message || '');
      if (msg.includes('Closed') || msg.includes('kind: Closed')) {
        try {
          client.$disconnect().catch(() => {});
        } catch {}
        global.__prismaClient = undefined;
      } else {
        console.warn('[PostgreSQL/Prisma Notice]:', msg || e);
      }
    });

    global.__prismaClient = client;
  }
  return global.__prismaClient;
};

export interface DatabaseStatus {
  isConfigured: boolean;
  isConnected: boolean;
  databaseType: 'PostgreSQL';
  databaseUrlMasked: string;
  errorMessage?: string;
  lastChecked: string;
}

/**
 * Health check & diagnostic utility for the PostgreSQL connection
 */
export async function checkDatabaseConnection(): Promise<DatabaseStatus> {
  const isConfigured = isDatabaseUrlConfigured();
  const rawUrl = process.env.DATABASE_URL || '';
  
  // Mask credentials in DATABASE_URL for safe display
  const maskedUrl = rawUrl.replace(/:([^@]+)@/, ':****@');

  if (!isConfigured) {
    return {
      isConfigured: false,
      isConnected: false,
      databaseType: 'PostgreSQL',
      databaseUrlMasked: 'DATABASE_URL مقداردهی نشده است (آماده دریافت پیکربندی)',
      errorMessage: 'متغیر محیطی DATABASE_URL تنظیم نشده است. سیستم در حال حاضر از موتور پایدار سرور استفاده می‌کند.',
      lastChecked: new Date().toISOString(),
    };
  }

  try {
    const prisma = getPrismaClient();
    // Test simple connectivity query with raw SQL and a safe 3.5s timeout
    await Promise.race([
      prisma.$queryRaw`SELECT 1 as connected`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('اتصال به PostgreSQL منقضی شد (Timeout)')), 3500)
      ),
    ]);
    return {
      isConfigured: true,
      isConnected: true,
      databaseType: 'PostgreSQL',
      databaseUrlMasked: maskedUrl,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    // If connection was closed or broken, safely clean up and reset client
    try {
      await global.__prismaClient?.$disconnect().catch(() => {});
    } catch {}
    global.__prismaClient = undefined;

    const errorMsg = error instanceof Error ? error.message : 'خطای نامشخص در اتصال به دیتابیس PostgreSQL';
    return {
      isConfigured: true,
      isConnected: false,
      databaseType: 'PostgreSQL',
      databaseUrlMasked: maskedUrl,
      errorMessage: errorMsg,
      lastChecked: new Date().toISOString(),
    };
  }
}
