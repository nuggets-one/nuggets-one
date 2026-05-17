import { connectMongo, disconnectMongo } from './mongo-client'
import { resolveLegacyMedia } from './legacy-article-media'
import mongoose, { Types } from 'mongoose'

async function main() {
  const legacyId = process.argv[2]
  if (!legacyId) {
    console.error('Usage: npx tsx inspect-legacy-media.ts <legacy_mongo_id>')
    process.exit(1)
  }

  await connectMongo()
  const doc = await mongoose.connection.db!
    .collection('articles')
    .findOne({ _id: new Types.ObjectId(legacyId) })

  if (!doc) {
    console.error('No Mongo doc')
    process.exit(1)
  }

  const resolved = resolveLegacyMedia(doc as never)
  console.log('cardMedia.length:', resolved.cardMedia.length)
  console.log('heroIndex:', resolved.heroIndex)
  for (const row of resolved.cardMedia) {
    console.log(`  [${row.sort_order}] ${row.kind} ${row.url.slice(0, 100)}`)
  }
  console.log('doc.images array length:', Array.isArray(doc.images) ? doc.images.length : 0)
  console.log(
    'supportingMedia length:',
    Array.isArray(doc.supportingMedia) ? doc.supportingMedia.length : 0
  )

  await disconnectMongo()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
