import { pool } from './connection'
import { Guide, CreateGuideInput } from '../types/guide'

export async function getAllGuides(): Promise<Guide[]> {
  const result = await pool.query(
    'SELECT id, title, game, content, difficulty, created_at FROM guides ORDER BY created_at DESC'
  )
  return result.rows
}

export async function getGuideById(id: number): Promise<Guide | null> {
  const result = await pool.query(
    'SELECT id, title, game, content, difficulty, created_at FROM guides WHERE id = $1',
    [id]
  )
  return result.rows[0] || null
}

export async function createGuide(input: CreateGuideInput): Promise<Guide> {
  const { title, game, content, difficulty } = input
  const result = await pool.query(
    'INSERT INTO guides (title, game, content, difficulty) VALUES ($1, $2, $3, $4) RETURNING id, title, game, content, difficulty, created_at',
    [title, game, content, difficulty]
  )
  return result.rows[0]
}

export async function deleteGuide(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM guides WHERE id = $1', [id])
  return result.rowCount! > 0
}
