/**
 * One-off inspector: legacy Mongo `collections` collection shape and counts.
 * Run: npx tsx scripts/migrate/inspect-collections.ts
 */
import mongoose from 'mongoose'
import { connectMongo, disconnectMongo } from './mongo-client'

const CollectionSchema = new mongoose.Schema({}, { strict: false })
const MongoCollection =
  mongoose.models.Collection ||
  mongoose.model('Collection', CollectionSchema, 'collections')

async function main() {
  await connectMongo()

  const total = await MongoCollection.countDocuments()
  const isPublicTrue = await MongoCollection.countDocuments({ isPublic: true })
  const isPublicFalse = await MongoCollection.countDocuments({ isPublic: false })
  const noIsPublic = await MongoCollection.countDocuments({ isPublic: { $exists: false } })

  console.log('\nMongo collections counts:')
  console.log('  total:', total)
  console.log('  isPublic=true:', isPublicTrue)
  console.log('  isPublic=false:', isPublicFalse)
  console.log('  isPublic missing:', noIsPublic)

  const samples = await MongoCollection.find().limit(5).lean()
  for (const doc of samples) {
    const d = doc as Record<string, unknown>
    const keys = Object.keys(d).sort()
    const title =
      (d.rawName as string) ||
      (d.canonicalName as string) ||
      (d.title as string) ||
      '(no title)'
    const entries = Array.isArray(d.entries) ? d.entries.length : 0
    const articles = Array.isArray(d.articles) ? d.articles.length : 0
    console.log('\n--- sample ---')
    console.log('  _id:', d._id)
    console.log('  title:', title)
    console.log('  isPublic:', d.isPublic)
    console.log('  type:', d.type)
    console.log('  entries:', entries, 'articles[]:', articles)
    console.log('  keys:', keys.join(', '))
  }

  await disconnectMongo()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
