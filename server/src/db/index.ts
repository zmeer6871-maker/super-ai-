import { Pool } from 'pg'
import fs from 'fs'
import path from 'path'
import { Client } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const connectionString = process.env.DATABASE_URL || ''

export const pool = new Pool({ connectionString })

export async function runMigrations() {
  if (!connectionString) {
    console.log('DATABASE_URL not configured — skipping migrations')
    return
  }
  const migrationsDir = path.join(__dirname, '../../migrations')
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()
  const client = new Client({ connectionString })
  await client.connect()
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS migrations (id TEXT PRIMARY KEY, run_at TIMESTAMP DEFAULT now())`)
    for (const file of files) {
      const id = file
      const already = await client.query('SELECT 1 FROM migrations WHERE id=$1', [id])
      if (already.rowCount > 0) continue
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')
      console.log('Running migration', file)
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('INSERT INTO migrations(id) VALUES($1)', [id])
      await client.query('COMMIT')
    }
  } catch (e) {
    await client.query('ROLLBACK')
    console.error('Migration failed', e)
    throw e
  } finally {
    await client.end()
  }
}
