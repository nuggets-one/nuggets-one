import { z } from 'zod'

export const consumerDisclaimerFormSchema = z.object({
  consumer_disclaimer: z
    .string()
    .trim()
    .min(1, 'Disclaimer text is required')
    .max(4000, 'Disclaimer must be at most 4000 characters'),
})

export type ConsumerDisclaimerFormInput = z.infer<typeof consumerDisclaimerFormSchema>
