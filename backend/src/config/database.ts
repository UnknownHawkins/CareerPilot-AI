import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { logger } from '../utils/logger';
import * as schema from '../models/schema';

// Export db instance
export let db: ReturnType<typeof drizzle<typeof schema>>;

export const connectDB = async (): Promise<void> => {
  try {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url || !authToken) {
      throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set');
    }

    const client = createClient({
      url,
      authToken,
    });

    db = drizzle(client, { schema });
    
    // Test the connection
    await client.execute('SELECT 1');
    
    logger.info('Turso (libSQL) Connected Successfully');
  } catch (error) {
    logger.error('Turso Connection Error:', error);
    process.exit(1);
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    // libSQL client doesn't require explicit close, but we can log it
    logger.info('Turso connection closed');
  } catch (error) {
    logger.error('Error closing Turso connection:', error);
    throw error;
  }
};
