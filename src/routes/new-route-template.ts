import path from 'node:path'
import { Buffer } from 'node:buffer'
import express from 'express'
import multer from 'multer'

const upload = multer({
  storage: multer.diskStorage({
    destination(_req, file, cb) {
      if (file.fieldname === 'file')
        cb(null, './uploads/file/')

      else if (file.fieldname === 'tepdinhkem')
        cb(null, './uploads/tepdinhkem/')
    },
    filename(_req, file, cb) {
      cb(null, `${Date.now()}${path.extname(file.originalname)}`)
    },
  }),
  fileFilter: (_req, file, cb) => {
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8')
    cb(null, true)
  },
})

export const routerName = express.Router()

routerName.post('/upload', upload.single('file'), async (_req, res) => {
  res.status(200).send('Service is up and running!')
})
