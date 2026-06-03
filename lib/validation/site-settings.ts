import { z } from 'zod'

export const consumerDisclaimerFormSchema = z.object({
  consumer_disclaimer: z
    .string()
    .trim()
    .min(1, 'Disclaimer text is required')
    .max(4000, 'Disclaimer must be at most 4000 characters'),
})

export const pushDigestIntervalFormSchema = z.object({
  push_digest_interval_hours: z.enum(['1', '2', '3']),
})

export type ConsumerDisclaimerFormInput = z.infer<typeof consumerDisclaimerFormSchema>
export type PushDigestIntervalFormInput = z.infer<typeof pushDigestIntervalFormSchema>
