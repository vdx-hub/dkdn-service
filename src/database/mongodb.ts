import { logger } from '@services/logger'
import type { ConnectOptions } from 'mongodb'
import { MongoClient } from 'mongodb'

const _client = new MongoClient(process.env.MONGODB_URI || '', {
  connectTimeoutMS: 30000,
} as ConnectOptions)
_client.connect()
_client.on('serverOpening', (e) => {
  logger('DB').info('MongoDB connected successfully')
})
export { _client }
