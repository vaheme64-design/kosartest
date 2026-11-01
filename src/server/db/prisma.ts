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
    global.__prismaClient = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
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
    // Test simple connectivity query with raw SQL
    await prisma.$queryRaw`SELECT 1 as connected`;
    return {
      isConfigured: true,
      isConnected: true,
      databaseType: 'PostgreSQL',
      databaseUrlMasked: maskedUrl,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
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
