import { Pool } from 'pg';
import { env } from './env';

// DATABASE_SSL=true  → SSL with certificate verification (managed cloud DBs: RDS, Supabase, etc.)
// DATABASE_SSL=false → no SSL (local PostgreSQL on the same server)
// default: false
const sslConfig = env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : false;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: sslConfig,
});

export async function query(text: string, params?: unknown[]) {
  const start = Date.now();
  const result = await pool.query(text, params);
  if (env.NODE_ENV === 'development') {
    console.log('query', { text: text.substring(0, 80), duration: Date.now() - start, rows: result.rowCount });
  }
  return result;
}
