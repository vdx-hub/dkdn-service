import { logger } from '@services/logger';
import sql from 'mssql';
const config = {
  user: 'dev',
  password: 'juniper@123',
  server: '192.168.68.212',
  port: 1433,
  database: 'QLTV_DB',
  options: {
    cryptoCredentialsDetails: {
      minVersion: 'TLSv1'
    },
    encrypt: false,
    enableArithAbort: false
  },
  requestTimeout: 1500000,
  connectionTimeout: 150000,
  pool: {
    max: 200,
    min: 0
  }
}
const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    logger("DB").info('Connected to MSSQL')
    return pool;
  })
  .catch(err => logger("DB").error('Database Connection Failed! Bad Config: ', err))

module.exports = {
  sql, poolPromise, config
}