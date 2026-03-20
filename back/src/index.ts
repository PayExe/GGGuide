import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'

import { env, validateEnv } from './utils/env'
import { testConnection, closePool } from './db/connection'
import { initSchema } from './db/schema'
import { loggerMiddleware } from './middleware/logger'
import { errorHandler } from './middleware/errorHandler'
import routes from './routes'

validateEnv()

const app = new Hono()

app.use('*', cors())
app.use('*', loggerMiddleware)

app.route('/api', routes)

app.get('/health', (c) => c.json({ status: 'ok' }))

app.notFound((c) => {
  return c.json({ error: 'Route not found' }, { status: 404 })
})

async function main() {
  try {
    const connected = await testConnection()
    if (!connected) {
      console.error('❌ Failed to connect to database. Exiting.')
      process.exit(1)
    }

    await initSchema()

    const port = env.PORT
    console.log(`🚀 GGGuide backend running on http://localhost:${port}`)

    const server = serve(
      {
        fetch: app.fetch,
        port,
      },
      (info) => {
        console.log(`✅ Server started on port ${info.port}`)
      }
    )

    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down gracefully...')
      await closePool()
      process.exit(0)
    })

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Shutting down gracefully...')
      await closePool()
      process.exit(0)
    })
  } catch (err) {
    console.error('❌ Failed to start server:', err)
    process.exit(1)
  }
}

main()
