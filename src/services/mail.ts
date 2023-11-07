import nodemailer from 'nodemailer'
import handlebars from 'handlebars'

const databaseName = process.env.DATABASE_NAME
const mailTemplateCollection = process.env.MAIL_TEMPLATE_COLLECTION
const systemMail = process.env.SYSTEM_MAIL
const systemMailPass = process.env.SYSTEM_MAIL_PASS

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: systemMail,
    pass: systemMailPass,
  },
})

async function renderHTMLfromTemplateWithData(source, data) {
  const template = await handlebars.compile(source)
  return await template(data)
}

async function getTemplate(client, templateName, db) {
  const templateRecord = await client.db(db || databaseName).collection(mailTemplateCollection).findOne({
    MaMuc: templateName,
  })
  return templateRecord && templateRecord.templateData
}

async function sendMail(client, { db, from, to, subject, templateName, data }) {
  const template = await getTemplate(client, templateName, db)
  if (!template)
    return 'Fail to get template'
  const htmlToSend = await renderHTMLfromTemplateWithData(template, data)
  // console.log(htmlToSend);
  const mailOption = {
    from: `${from || 'Trung tâm TTDLMT'} <${systemMail}>`,
    // from: `${from} <${systemMail}>`,
    to, // "bar@example.com, baz@example.com"
    subject, // "Hello ✔" Subject line
    html: htmlToSend, // html body
  }
  let info
  try {
    info = await transporter.sendMail(mailOption)
  }
  catch (e) {
    console.log(e)
  }
  return info
}

async function autoSendT_EmailToSend(client) {
  const myCursor = await client.db(databaseName).collection('T_EmailToSend').find({
    $and: [
      { isSent: false },
      { isFail: { $ne: true } },
    ],
  })
  let count = 0
  let fail = 0
  while (await myCursor.hasNext()) {
    const mail = await myCursor.next()
    if (mail.mailTo?.indexOf('@') > -1 && mail.mailTemplate && mail.mailTemplateData) {
      const sentStatus = await sendMail(client, {
        db: databaseName,
        from: mail.mailFrom,
        to: mail.mailTo, // single mail !!! multiple => fix check success
        subject: mail.mailSubject,
        templateName: mail.mailTemplate._source.MaMuc,
        data: mail.mailTemplateData,
      })
      if (sentStatus?.accepted && sentStatus?.accepted.indexOf(mail.mailTo) > -1) {
        // mail success
        await client.db(databaseName).collection('T_EmailToSend').updateOne({
          _id: mail._id,
        }, {
          $set: {
            isSent: true,
          },
        })
        count++
      }
      else {
        await client.db(databaseName).collection('T_EmailToSend').updateOne({
          _id: mail._id,
        }, {
          $set: {
            isFail: true,
          },
        })
        fail++
      }
    }
    else {
      await client.db(databaseName).collection('T_EmailToSend').updateOne({
        _id: mail._id,
      }, {
        $set: {
          isFail: true,
        },
      })
      fail++
    }
  }
  return (count > 0 || fail > 0)
    ? {
        success: `Successfully Sent ${count} mail(s)`,
        fail: `Fail to send ${fail} mail(s)`,
      }
    : ''
}

async function autoSendMail(client, db) {
  const myCursor = await client.db(db).collection('T_EmailToSend').find({
    $and: [
      { isSent: false },
      { isFail: { $ne: true } },
    ],
  })
  let count = 0
  let fail = 0
  while (await myCursor.hasNext()) {
    const mail = await myCursor.next()
    if (mail.mailTo.includes('@')) {
      const sentStatus = await sendMail(client, {
        db,
        from: mail.mailFrom || 'System',
        to: mail.mailTo, // single mail !!! multiple => fix check success
        subject: mail.mailSubject,
        templateName: mail.mailTemplate._source.MaMuc,
        data: mail.mailTemplateData,
      })
      if (sentStatus?.accepted && sentStatus?.accepted.indexOf(mail.mailTo) > -1) {
        // mail success
        await client.db(db).collection('T_EmailToSend').updateOne({
          _id: mail._id,
        }, {
          $set: {
            isSent: true,
          },
        })
        count++
      }
      else {
        await client.db(db).collection('T_EmailToSend').updateOne({
          _id: mail._id,
        }, {
          $set: {
            isFail: true,
          },
        })
        fail++
      }
    }
    else {
      await client.db(db).collection('T_EmailToSend').updateOne({
        _id: mail._id,
      }, {
        $set: {
          isFail: true,
        },
      })
      fail++
    }
  }
  return (count > 0 || fail > 0)
    ? {
        success: `Successfully Sent ${count} mail(s)`,
        fail: `Fail to send ${fail} mail(s)`,
      }
    : ''
}
