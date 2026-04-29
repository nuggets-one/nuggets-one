// Server-side exports — do not import these in client components
export { createClient as createServerClient } from './server'
export { adminClient } from './admin'

// Client-side export
export { createClient as createBrowserClient } from './client'
