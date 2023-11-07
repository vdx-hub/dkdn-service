import { logger } from '@services/logger'
import type { ConnectOptions } from 'mongodb'
import { MongoClient } from 'mongodb'

const _client = new MongoClient(process.env.MONGODB_URI || '', {
  useUnifiedTopology: true,
  useNewUrlParser: true,
  connectTimeoutMS: 10000,
} as ConnectOptions)
_client.connect()
_client.on('serverOpening', (e) => {
  logger('DB').info('MongoDB connected successfully')
})
export { _client }
