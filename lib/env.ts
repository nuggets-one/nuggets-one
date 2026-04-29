import { z } from 'zod'

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url()
    .regex(/\.supabase\.co$/, 'Must be a Supabase project URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1)
    .refine(
      (val) => val.split('.').length === 3,
      'Must be a valid JWT (3 segments)'
    ),
})

const serverEnvSchema = z.object({
  SUPABASE_URL: z
    .string()
    .url()
    .regex(/\.supabase\.co$/, 'Must be a Supabase project URL'),
  SUPABASE_ANON_KEY: z
    .string()
    .min(1)
    .refine(
      (val) => val.split('.').length === 3,
      'Must be a valid JWT (3 segments)'
    ),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1)
    .refine(
      (val) => val.split('.').length === 3,
      'Must be a valid JWT (3 segments)'
    ),
})

// Client env — safe to access anywhere
export const clientEnv = clientEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
})

// Server env — must not be imported by client components
// This file does not have import 'server-only' because clientEnv
// is intentionally accessible in shared code.
// If you need server env in a client-only module, import from 
// lib/supabase/admin.ts instead (which does have server-only).
export const serverEnv = (() => {
  if (typeof window !== 'undefined') {
    throw new Error(
      'serverEnv accessed on the client — import from server modules only'
    )
  }
  return serverEnvSchema.parse({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  })
})()
