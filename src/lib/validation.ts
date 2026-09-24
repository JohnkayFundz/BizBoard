import { z } from 'zod'

const optionalText=(max:number)=>z.string().trim().max(max).optional().or(z.literal(''))
const optionalEmail=z.string().trim().email().max(160).optional().or(z.literal(''))
const optionalUrl=z.string().trim().url().max(500).optional().or(z.literal(''))

export const leadSchema=z.object({
 company:z.string().trim().min(2).max(120),
 contact_name:optionalText(100),
 role:optionalText(100),
 email:optionalEmail,
 phone:z.string().trim().regex(/^[0-9+()\-\s.]{7,30}$/,'Enter a valid phone number').optional().or(z.literal('')),
 website:optionalUrl,
 instagram:optionalText(120),
 niche:optionalText(100),
 location:optionalText(100),
 source:z.string().trim().max(60).default('Manual'),
 status:z.enum(['New Lead','Contacted','Replied','Interested','Proposal Sent','Won','Lost']),
 deal_value:z.coerce.number().nonnegative().max(1000000000).optional(),
 next_follow_up:z.string().regex(/^\d{4}-\d{2}-\d{2}$/,'Use a valid follow-up date').optional().or(z.literal('')),
 notes:optionalText(2000)
})

export const intelligenceSchema=z.object({
 url:z.string().trim().url().max(500),
 checks:z.object({mobile:z.boolean(),cta:z.boolean(),contact:z.boolean(),ecommerce:z.boolean(),seo:z.boolean()})
})

export const proposalSchema=z.object({
 service:z.string().trim().min(2).max(120),
 investment:z.coerce.number().finite().nonnegative().max(1000000000),
 timeline:z.string().trim().min(2).max(80),
 taxRate:z.coerce.number().finite().min(0).max(100)
})

export function cleanText(value:unknown,max=2000){
 return String(value??'').replace(/[<>]/g,'').trim().slice(0,max)
}
