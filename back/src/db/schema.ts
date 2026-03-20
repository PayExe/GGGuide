import { pool } from './connection'

export async function initSchema() {
  try {
    // Create guides table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS guides (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        game VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        difficulty VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create indexes for better query performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_game ON guides(game)
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_created_at ON guides(created_at)
    `)

    console.log('✅ Database schema initialized')
    return true
  } catch (err) {
    console.error('❌ Failed to initialize schema:', err)
    return false
  }
}
