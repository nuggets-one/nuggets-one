import { z } from 'zod'

const uuidSchema = z.string().uuid()

const optionalUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((s) => s === '' || /^https?:\/\//i.test(s), 'Cover URL must be http(s) or empty')

const optionalParentId = z
  .union([z.literal(''), z.literal('none'), uuidSchema])
  .optional()
  .transform((v) => {
    if (!v || v === '' || v === 'none') return null
    return v
  })

const optionalFeaturedOrder = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? null : v),
  z.number().int().min(0).max(999).nullable().optional()
)

export const collectionMetadataSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(2000).optional().nullable(),
  curator_name: z.string().trim().min(1).max(200),
  cover_image_url: optionalUrl.optional().nullable(),
  status: z.enum(['draft', 'published']),
  parent_id: optionalParentId,
  is_featured: z.boolean().optional().default(false),
  featured_order: optionalFeaturedOrder,
})

export const collectionCreateSchema = collectionMetadataSchema

export const collectionUpdateSchema = collectionMetadataSchema.extend({
  id: uuidSchema,
})

export const collectionAddEntrySchema = z.object({
  collection_id: uuidSchema,
  article_id: uuidSchema,
})

export const collectionRemoveEntrySchema = collectionAddEntrySchema

export const collectionReorderEntrySchema = z.object({
  collection_id: uuidSchema,
  article_id: uuidSchema,
  direction: z.enum(['up', 'down']),
})

export type CollectionMetadataInput = z.infer<typeof collectionMetadataSchema>
