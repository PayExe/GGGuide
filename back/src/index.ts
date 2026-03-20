import express from 'express'
import Database from 'better-sqlite3'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config()

const app = express()
app.use(express.json())

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  next()
})

const dbPath = path.join(process.cwd(), 'guides.db')
const db = new Database(dbPath)
db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS guides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    game TEXT NOT NULL,
    content TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

console.log(`✅ Database ready at ${dbPath}`)

app.get('/api/guides', (req, res) => {
  try {
    const guides = db.prepare('SELECT * FROM guides ORDER BY created_at DESC').all()
    res.json(guides)
  } catch (err) {
    console.error('GET /api/guides error:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

app.get('/api/guides/:id', (req, res) => {
  try {
    const guide = db.prepare('SELECT * FROM guides WHERE id = ?').get(req.params.id)
    if (!guide) {
      return res.status(404).json({ error: 'Guide non trouvé' })
    }
    res.json(guide)
  } catch (err) {
    console.error('GET /api/guides/:id error:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

app.post('/api/guides', (req, res) => {
  try {
    const { title, game, content, difficulty } = req.body
    
    if (!title || !game || !content || !difficulty) {
      return res.status(400).json({ error: 'Champs manquants' })
    }

    const stmt = db.prepare(
      `INSERT INTO guides (title, game, content, difficulty) VALUES (?, ?, ?, ?)`
    )
    const info = stmt.run(title, game, content, difficulty)
    
    const newGuide = db.prepare('SELECT * FROM guides WHERE id = ?').get(info.lastInsertRowid)
    res.status(201).json(newGuide)
  } catch (err) {
    console.error('POST /api/guides error:', err)
    res.status(500).json({ error: 'Erreur lors de la création' })
  }
})

app.delete('/api/guides/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM guides WHERE id = ?')
    const info = stmt.run(req.params.id)
    
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Guide non trouvé' })
    }
    res.json({ message: 'Guide supprimé' })
  } catch (err) {
    console.error('DELETE /api/guides/:id error:', err)
    res.status(500).json({ error: 'Erreur lors de la suppression' })
  }
})

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`🚀 GGGuide backend running on http://localhost:${PORT}`)
})
