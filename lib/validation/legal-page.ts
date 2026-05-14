import { z } from 'zod'

const slugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9-]+$/, 'Slug: lowercase letters, numbers, and hyphens only')
  .refine((s) => !s.startsWith('-') && !s.endsWith('-'), 'Slug cannot start or end with a hyphen')
  .refine((s) => s !== 'new', 'Slug "new" is reserved')

export const legalPageCreateSchema = z.object({
  slug: slugSchema,
  label: z.string().min(1).max(200),
  page_title: z.string().min(1).max(300),
  body_markdown: z.string().max(500_000),
  is_enabled: z.boolean(),
  show_in_footer: z.boolean(),
  show_in_account_menu: z.boolean(),
  robots_index: z.boolean(),
})

export const legalPageUpdateSchema = z.object({
  slug: slugSchema,
  label: z.string().min(1).max(200),
  page_title: z.string().min(1).max(300),
  body_markdown: z.string().max(500_000),
  is_enabled: z.boolean(),
  show_in_footer: z.boolean(),
  show_in_account_menu: z.boolean(),
  robots_index: z.boolean(),
})

export type LegalPageCreateInput = z.infer<typeof legalPageCreateSchema>
export type LegalPageUpdateInput = z.infer<typeof legalPageUpdateSchema>
