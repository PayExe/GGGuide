import { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'

export function errorHandler(err: unknown, c: Context) {
  console.error('❌ Error:', err)

  if (err instanceof HTTPException) {
    return c.json(
      { error: err.message },
      { status: err.status }
    )
  }

  if (err instanceof Error) {
    return c.json(
      { error: err.message || 'Erreur serveur' },
      { status: 500 }
    )
  }

  return c.json(
    { error: 'Erreur serveur interne' },
    { status: 500 }
  )
}
