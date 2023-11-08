import 'dotenv/config'
import https from 'node:https'
import bodyParser from 'body-parser'
import express from 'express'

import { mailRouter } from '@routes/index'
import { ensureDir } from 'fs-extra'
import { actionLog, logger } from '@services/logger'
import * as cron from 'node-cron'
import { createEmailInstance } from '@services/mail'

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

// Route
app.use(mailRouter)
ensureDir('./logs/')

// Cron
const mailDKDN = createEmailInstance({
  db: 'CSDL_DKDN',
  collectionQueue: 'T_EmailQueue',
  templateCollection: 'C_EmailTemplate',
})
cron.schedule('* * * * *', async () => {
  const res = await mailDKDN.autoSendMail()
  res && actionLog.info(JSON.stringify(res))
})

app.listen(9000, async () => {
  logger('startup').info('Server is up! http://0.0.0.0:9000')
})
