import 'dotenv/config'
import bodyParser from 'body-parser';
import https from 'https';
import express from 'express';

import postgreRouter from "@routes/postgre";
import importRouter from "@routes/importXlsx";
import { ensureDir } from 'fs-extra';
import { logger } from '@services/logger';


https.globalAgent.options.rejectUnauthorized = false;

const app = express();
app.use(bodyParser.json({
  limit: "50mb"
}));
app.use(
  bodyParser.urlencoded({
    limit: "50mb",
    extended: true,
    parameterLimit: 50000,
  })
);
app.use((err: any, _req: any, res: any, _next: any) => {
  res.status(err.status || 500);
  res.json({
    message: err.message,
    error: err,
  });
});
ensureDir('./logs/')
ensureDir('./uploads/xlsx/')
ensureDir('./uploads/tepdinhkem/')
app.use('/import', importRouter)
app.use('/postgre', postgreRouter)
app.listen(9000, async () => {
  logger('startup').info("Server is up! http://0.0.0.0:9000");
})
