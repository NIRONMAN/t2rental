import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.text('GET Works'))
app.post('/', (c) => c.text('POST Works'))

export default app
