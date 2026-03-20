import { Pool } from 'pg'
import { env } from '../utils/env'

export const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
})

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client:', err)
})

export async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()')
    console.log('✅ PostgreSQL connection successful')
    return true
  } catch (err) {
    console.error('❌ PostgreSQL connection failed:', err)
    return false
  }
}

export async function closePool() {
  await pool.end()
  console.log('📴 PostgreSQL pool closed')
}
