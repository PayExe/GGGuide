import { Hono } from 'hono'
import guides from './guides'

const routes = new Hono()

routes.route('/guides', guides)

export default routes
