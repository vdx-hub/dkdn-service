import express from 'express'
import type { MailQueue } from '@services/mail'
import { createEmailInstance, prepareDBMail } from '@services/mail'
import { authCheck } from 'utils/jwt'
import { actionLog, logger } from '@services/logger'
import { vuejx } from '@services/vuejx-core'

export const mailRouter = express.Router()

mailRouter.post('/ping', async (_req, res) => {
  res.status(200).send('Service is up and running!')
})

mailRouter.post('/init_service', async (req, res, next) => {
  // auth
  const token = req.header('token')
  if (!token) {
    res.status(403).send('Unauthenticated!')
    return
  }
  if (!(await authCheck(token, next))) {
    res.status(403).send('Token invalid!')
    return
  }

  const db = req.header('db')
  const site = req.header('site')
  const { templateCollection, collectionQueue } = req.body
  if (!(db && site)) {
    res.status(403).send('db, site là bắt buộc')
    return
  }

  logger('mailing').info(`init_service ${db}, ${site}, ${templateCollection}, ${collectionQueue}`)
  await prepareDBMail({
    db,
    templateCollection,
    collectionQueue,
    site,
    token,
  })
  res.status(200).send('Service init success!')
})

mailRouter.post('/send_mail', async (req, res, next) => {
  // auth
  const token = req.header('token')
  if (!token) {
    res.status(403).send('Unauthenticated!')
    return
  }
  if (!(await authCheck(token, next))) {
    res.status(403).send('Token invalid!')
    return
  }

  const db = req.header('db')
  const site = req.header('site')
  if (!(db && site)) {
    res.status(403).send('db, site là bắt buộc')
    return
  }

  const { templateCollection, collectionQueue, from, to, subject, templateName, data, isQueue } = req.body
  const mailInstance = createEmailInstance({ db, templateCollection, collectionQueue })
  const adminVuejx = vuejx(db, site, token)
  if (!isQueue) {
    // send Mail manually
    const sendMailResponse = await mailInstance.sendMail({
      from,
      to,
      subject,
      templateName,
      data,
    })
    res.status(sendMailResponse.status).send(sendMailResponse)
    let sentStatusData
    if (sendMailResponse?.status === 200) {
      sentStatusData = {
        isSent: true,
        info: sendMailResponse.res,
      }
      actionLog.info(`Send email to ${to} success`)
    }
    else {
      sentStatusData = {
        isFail: true,
        failMessage: sendMailResponse.msg,
        ...sendMailResponse.res ? { info: sendMailResponse.res } : {},
      }
      actionLog.info(`Send email to ${to} failed`)
    }
    // create T_EmailQueue as logs
    await adminVuejx.processDb(collectionQueue || 'T_EmailQueue', {
      mailFrom: from,
      mailTo: to,
      mailSubject: subject,
      mailTemplate: {
        _source: {
          MaMuc: templateName,
        },
      },
      mailTemplateData: data,
      ...sentStatusData,
    } as MailQueue)
  }
  else {
    // add email to T_EmailQueue
    const queueStatus = await adminVuejx.processDb(collectionQueue || 'T_EmailQueue', {
      mailFrom: from,
      mailTo: to,
      mailSubject: subject,
      mailTemplate: {
        _source: {
          MaMuc: templateName,
        },
      },
      mailTemplateData: data,
      isSent: false,
    } as MailQueue)
    res.status(200).send(queueStatus)
  }
})
