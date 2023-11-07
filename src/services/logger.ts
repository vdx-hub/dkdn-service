import 'winston-daily-rotate-file'
import path from 'node:path'
import { config, createLogger, format, transports } from 'winston'

const { timestamp, label, printf, errors } = format

const logDir = process.env.LOGS_PATH || 'logs'

const myFormat = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level}: ${message}`
})
function timezoned() {
  return new Date().toLocaleString('vi', {
    timeZone: 'Asia/Ho_Chi_Minh',
  })
}
const transportErr = new (transports.DailyRotateFile)({
  filename: path.join(logDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '10m',
  level: 'error',
  maxFiles: '30d',
  format: format.combine(
    format.colorize(),
    myFormat,
  ),
})

const transportCombine = new (transports.DailyRotateFile)({
  filename: path.join(logDir, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '10m',
  maxFiles: '30d',
  format: format.combine(
    format.colorize(),
    myFormat,
  ),
})

const transportAction = new (transports.DailyRotateFile)({
  filename: path.join(logDir, 'action-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  level: '',
  maxSize: '10m',
  maxFiles: '30d',
  format: format.combine(
    format.colorize(),
    myFormat,
  ),
})

const transportConsole = new (transports.Console)({
  format: format.combine(
    format.colorize(),
    myFormat,
  ),
})

const actionLog = createLogger({
  levels: config.syslog.levels,
  format: format.combine(
    timestamp({ format: timezoned }),
    myFormat,
    label({ label: 'Action' }),
    errors({ stack: true }),
  ),
  defaultMeta: { service: 'action-service' },
  transports: [
    transportAction,
    transportConsole,
  ],
})

const transportMethod: any = [
  transportErr,
  transportCombine,
]
if (process.env.NODE_ENV !== 'production')
  transportMethod.push(transportConsole)

const loggerTmp: any = {}
function logger(labelValue = '') {
  if (loggerTmp[labelValue]) {
    return loggerTmp[labelValue]
  }
  else {
    loggerTmp[labelValue] = createLogger({
      levels: config.syslog.levels,
      format: format.combine(
        timestamp({ format: timezoned }),
        myFormat,
        label({ label: labelValue }),
        errors({ stack: true }),
      ),
      defaultMeta: { service: 'user-service' },
      transports: transportMethod,
    })
    return loggerTmp[labelValue]
  }
}

export { logger, actionLog }
