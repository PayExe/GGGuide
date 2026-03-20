import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import {
  getAllGuides,
  getGuideById,
  createGuide,
  deleteGuide,
} from '../db/queries'
import { CreateGuideInput } from '../types/guide'

const guides = new Hono()

guides.get('/', async (c) => {
  try {
    const allGuides = await getAllGuides()
    return c.json(allGuides)
  } catch (err) {
    console.error('GET /guides error:', err)
    throw new HTTPException(500, { message: 'Erreur serveur' })
  }
})

guides.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) {
      throw new HTTPException(400, { message: 'ID invalide' })
    }

    const guide = await getGuideById(id)
    if (!guide) {
      throw new HTTPException(404, { message: 'Guide non trouvé' })
    }

    return c.json(guide)
  } catch (err) {
    if (err instanceof HTTPException) throw err
    console.error('GET /guides/:id error:', err)
    throw new HTTPException(500, { message: 'Erreur serveur' })
  }
})

guides.post('/', async (c) => {
  try {
    const body = await c.req.json() as CreateGuideInput

    if (!body.title || !body.game || !body.content || !body.difficulty) {
      throw new HTTPException(400, { message: 'Champs manquants' })
    }

    const newGuide = await createGuide(body)
    return c.json(newGuide, { status: 201 })
  } catch (err) {
    if (err instanceof HTTPException) throw err
    console.error('POST /guides error:', err)
    throw new HTTPException(500, { message: 'Erreur lors de la création' })
  }
})

guides.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) {
      throw new HTTPException(400, { message: 'ID invalide' })
    }

    const deleted = await deleteGuide(id)
    if (!deleted) {
      throw new HTTPException(404, { message: 'Guide non trouvé' })
    }

    return c.json({ message: 'Guide supprimé' })
  } catch (err) {
    if (err instanceof HTTPException) throw err
    console.error('DELETE /guides/:id error:', err)
    throw new HTTPException(500, { message: 'Erreur lors de la suppression' })
  }
})

export default guides
