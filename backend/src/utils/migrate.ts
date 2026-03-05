import fs from 'fs';
import path from 'path';
import { pool } from '../config/db';

async function migrate() {
  const migrationsDir = path.join(__dirname, '../../../database/migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`Running migration: ${file}`);
    await pool.query(sql);
    console.log(`  Done: ${file}`);
  }

  console.log('All migrations complete');
  await pool.end();
}

migrate().catch(err => { console.error(err); process.exit(1); });
