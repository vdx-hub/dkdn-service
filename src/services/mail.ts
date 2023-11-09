import nodemailer from 'nodemailer'
import handlebars from 'handlebars'
import { _client } from '@db/mongodb'
import type SMTPTransport from 'nodemailer/lib/smtp-transport'
import { actionLog } from './logger'
import { vuejx } from './vuejx-core'

interface Response {
  status: number
  msg: string
  res?: any
}

export interface MailQueue {
  mailTo: string
  mailFrom: string
  mailSubject: string
  mailTemplate: SourceTemplate
  mailTemplateData: any
  isSent: boolean
  isFail: boolean
  failMessage: string
}
interface SourceTemplate {
  _source: MailTemplate
}
interface MailTemplate {
  MaMuc: string
  TenMuc: string
  templateData: string
}

const systemMail = process.env.SYSTEM_MAIL
const systemMailPass = process.env.SYSTEM_MAIL_PASS

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: systemMail,
    pass: systemMailPass,
  },
})

function renderHTMLfromTemplateWithData(source, data) {
  const template = handlebars.compile(source)
  return template(data)
}

function validateMail(mail: string) {
  const emailRegex = /\w+@\w+\.[a-zA-Z_]+?$|\w+@\w+\.[a-zA-Z_]+?\.[a-zA-Z_]+?$|\w+@\w+-\w+\.[a-zA-Z_]+?$|\w+@\w+-\w+\.[a-zA-Z_]+?\.[a-zA-Z_]+?$/
  return !!mail.match(emailRegex)
}

export async function prepareDBMail({ db, site, templateCollection = 'C_EmailTemplate', collectionQueue = 'T_EmailQueue', token }) {
  _client.db(db).collection(templateCollection)
  _client.db(db).collection(collectionQueue)
  const adminVuejx = vuejx(db, site, token)

  // templateCollection
  const collectionTemplateExists = await _client.db(db).collection('vuejx_collection').findOne({
    shortName: templateCollection,
  })
  if (!collectionTemplateExists) {
    const res = await adminVuejx.processDb('vuejx_collection', {
      MaMuc: templateCollection,
      shortName: templateCollection,
      TenMuc: templateCollection,
      title: templateCollection,
      cfg_mapping: `{"properties":{"MaMuc":{"type":"text","fields":{"keyword":{"type":"keyword","ignore_above":256,"normalizer":"lowercase_normalizer"},"raw":{"type":"text","analyzer":"nfd_normalized"}}},"TenMuc":{"type":"text","fields":{"keyword":{"type":"keyword","ignore_above":256,"normalizer":"lowercase_normalizer"},"raw":{"type":"text","analyzer":"nfd_normalized"}}}}}`,
    })
    actionLog.info(JSON.stringify(res))
  }

  // collectionQueue
  const collectionQueueExists = await _client.db(db).collection('vuejx_collection').findOne({
    shortName: collectionQueue,
  })
  if (!collectionQueueExists) {
    const res = await adminVuejx.processDb('vuejx_collection', {
      MaMuc: collectionQueue,
      shortName: collectionQueue,
      TenMuc: collectionQueue,
      title: collectionQueue,
      cfg_mapping: `{"properties":{"mailFrom":{"type":"keyword"},"mailTo":{"type":"keyword"},"mailSubject":{"type":"keyword"},"mailTemplate":{"properties":{"_source":{"properties":{"MaMuc":{"type":"text","fields":{"keyword":{"type":"keyword","ignore_above":256,"normalizer":"lowercase_normalizer"},"raw":{"type":"text","analyzer":"nfd_normalized"}}},"TenMuc":{"type":"text","fields":{"keyword":{"type":"keyword","ignore_above":256,"normalizer":"lowercase_normalizer"},"raw":{"type":"text","analyzer":"nfd_normalized"}}}}}}},"mailTemplateData":{"type":"text"}}}`,
    })
    actionLog.info(JSON.stringify(res))
  }
}

export function createEmailInstance({ db, templateCollection = 'C_EmailTemplate', collectionQueue = 'T_EmailQueue' }) {
  async function sendMail({ from, to, subject, templateName, data }) {
    let res: Response = {
      status: 500,
      msg: 'Lỗi không xác định',
    }

    if (!validateMail(to)) {
      res = {
        status: 400,
        msg: 'Mail không hợp lệ',
      }
      return res
    }

    const template = await getTemplate({ MaMuc: templateName })
    if (!template) {
      res = {
        status: 400,
        msg: 'Không tìm thấy mẫu mail',
      }
      return res
    }

    const htmlToSend = renderHTMLfromTemplateWithData(template, data)
    const mailOption = {
      from: `${from || 'Hệ thống'} <${systemMail}>`,
      to, // "bar@example.com
      subject, // "Hello ✔" Subject line
      html: htmlToSend, // html body
    }
    const info = await transporter.sendMail(mailOption)
    if (!info?.accepted) {
      res = {
        status: 500,
        msg: 'Gửi email thất bại',
        res: info,
      }
    }
    res = {
      status: 200,
      msg: 'Thành công',
      res: info,
    }
    return res
  }

  async function getTemplate(filter) {
    const templateRecord = await _client.db(db).collection(templateCollection).findOne(filter)
    return templateRecord && templateRecord.templateData
  }

  async function autoSendMail(filter) {
    const myCursor = _client.db(db).collection(collectionQueue).find({
      $and: [
        { isSent: false },
        { isFail: { $ne: true } },
        ...filter,
      ],
    })
    let successCount = 0
    let failCount = 0
    while (await myCursor.hasNext()) {
      const mail = await myCursor.next()
      if (!mail)
        continue

      const sentStatus: Response | SMTPTransport.SentMessageInfo = await sendMail({
        from: mail.mailFrom || 'System',
        to: mail.mailTo, // single mail !!! multiple => fix check success
        subject: mail.mailSubject,
        templateName: mail.mailTemplate._source.MaMuc,
        data: mail.mailTemplateData,
      })
      if (sentStatus?.status === 200) {
        await _client.db(db).collection('T_EmailToSend').updateOne({
          _id: mail._id,
        }, {
          $set: {
            isSent: true,
            info: sentStatus.res,
          },
        })
        successCount++
      }
      else {
        await _client.db(db).collection('T_EmailToSend').updateOne({
          _id: mail._id,
        }, {
          $set: {
            isFail: true,
            failMessage: sentStatus.msg,
            ...sentStatus.res ? { info: sentStatus.res } : {},
          },
        })
        failCount++
      }
    }
    if (successCount || failCount > 0) {
      return {
        ...successCount > 0 ? { success: `Successfully Sent ${successCount} mail(s)` } : {},
        ...failCount > 0 ? { fail: `Fail to Sent ${failCount} mail(s)` } : {},
      }
    }
  }
  return {
    sendMail,
    getTemplate,
    autoSendMail,
  }
}
