import 'dotenv/config'
import https from 'node:https'
import bodyParser from 'body-parser'
import express from 'express'

import { mailRouter } from '@routes/index'
import { ensureDir } from 'fs-extra'
import { logger } from '@services/logger'

https.globalAgent.options.rejectUnauthorized = false

const app = express()
app.use(bodyParser.json({
  limit: '100mb',
}))
app.use(
  bodyParser.urlencoded({
    limit: '100mb',
    extended: true,
    parameterLimit: 50000,
  }),
)
app.use((err: any, _req: any, res: any, _next: any) => {
  res.status(err.status || 500)
  res.json({
    message: err.message,
    error: err,
  })
})
ensureDir('./logs/')
ensureDir('./uploads/file/')
ensureDir('./uploads/tepdinhkem/')

// Route
app.use(mailRouter)

app.listen(9000, async () => {
  logger('startup').info('Server is up! http://0.0.0.0:9000')
})
