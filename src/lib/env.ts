import { z } from 'zod'

const envSchema=z.object({
 VITE_SUPABASE_URL:z.string().url(),
 VITE_SUPABASE_PUBLISHABLE_KEY:z.string().min(20)
})

const parsed=envSchema.safeParse(import.meta.env)
export const env=parsed.success?parsed.data:null
export const envError=parsed.success?'':parsed.error.issues.map(issue=>issue.path.join('.')+': '+issue.message).join('; ')
