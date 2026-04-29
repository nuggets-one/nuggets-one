// scripts/migrate/mongo-client.ts
import mongoose from 'mongoose'
import { config } from './config'

let connected = false

export async function connectMongo() {
  if (connected) return
  await mongoose.connect(config.mongoUri, { dbName: 'nuggets' })
  connected = true
  console.log('✓ Connected to MongoDB')
}

export async function disconnectMongo() {
  await mongoose.disconnect()
  console.log('✓ Disconnected from MongoDB')
}
