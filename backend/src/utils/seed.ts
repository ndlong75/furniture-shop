import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { pool } from '../config/db';

async function seed() {
  const seedsDir = path.join(__dirname, '../../../database/seeds');
  const files = fs.readdirSync(seedsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    if (file === '003_admin_user.sql') {
      const adminPassword = process.env.SEED_ADMIN_PASSWORD;
      if (!adminPassword) {
        throw new Error('SEED_ADMIN_PASSWORD environment variable is required to seed the admin user');
      }
      const hash = await bcrypt.hash(adminPassword, 10);
      await pool.query(
        `INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4) ON CONFLICT (email) DO NOTHING`,
        ['Admin', 'admin@furnitureshop.vn', hash, 'admin']
      );
      console.log('Seeded admin user: admin@furnitureshop.vn');
      continue;
    }
    const sql = fs.readFileSync(path.join(seedsDir, file), 'utf8');
    console.log(`Running seed: ${file}`);
    await pool.query(sql);
    console.log(`  Done: ${file}`);
  }

  console.log('Seeding complete');
  await pool.end();
}

seed().catch(err => { console.error(err); process.exit(1); });
