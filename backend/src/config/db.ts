import { Pool } from 'pg';
import { env } from './env';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  // rejectUnauthorized: true is the default — certificates are verified in production
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
});

export async function query(text: string, params?: unknown[]) {
  const start = Date.now();
  const result = await pool.query(text, params);
  if (env.NODE_ENV === 'development') {
    console.log('query', { text: text.substring(0, 80), duration: Date.now() - start, rows: result.rowCount });
  }
  return result;
}
