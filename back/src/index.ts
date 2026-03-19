import express from 'express'
import { Pool } from 'pg'

const app = express()
app.use(express.json())
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE')
  next()
})

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  database: process.env.DB_NAME || 'ggguide',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
})

pool.query(`
  CREATE TABLE IF NOT EXISTS guides (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    game VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    difficulty VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  )
`)

app.get('/api/guides', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM guides ORDER BY created_at DESC'
  )
  res.json(result.rows)
})

app.get('/api/guides/:id', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM guides WHERE id = $1',
    [req.params.id]
  )
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Guide non trouvé' })
  }
  res.json(result.rows[0])
})

app.post('/api/guides', async (req, res) => {
  const { title, game, content, difficulty } = req.body
  const result = await pool.query(
    `INSERT INTO guides (title, game, content, difficulty)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [title, game, content, difficulty]
  )
  res.status(201).json(result.rows[0])
})

app.delete('/api/guides/:id', async (req, res) => {
  await pool.query('DELETE FROM guides WHERE id = $1', [req.params.id])
  res.json({ message: 'Guide supprimé' })
})

app.listen(4000, () => console.log('GGGuide backend running on :4000'))
