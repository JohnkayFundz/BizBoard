import { z } from 'zod'
export const leadSchema=z.object({
 company:z.string().trim().min(2).max(120),
 contact_name:z.string().trim().max(100).optional().or(z.literal('')),
 role:z.string().trim().max(100).optional().or(z.literal('')),
 email:z.string().trim().email().max(160).optional().or(z.literal('')),
 phone:z.string().trim().max(30).optional().or(z.literal('')),
 website:z.string().trim().max(240).optional().or(z.literal('')),
 instagram:z.string().trim().max(120).optional().or(z.literal('')),
 niche:z.string().trim().max(100).optional().or(z.literal('')),
 location:z.string().trim().max(100).optional().or(z.literal('')),
 source:z.string().trim().max(60).default('Manual'),
 status:z.enum(['New Lead','Contacted','Replied','Interested','Proposal Sent','Won','Lost']),
 deal_value:z.union([z.string(),z.number()]).optional(),
 next_follow_up:z.string().optional().or(z.literal('')),
 notes:z.string().trim().max(2000).optional().or(z.literal(''))
})
export const intelligenceSchema=z.object({url:z.string().trim().url().max(500),checks:z.object({mobile:z.boolean(),cta:z.boolean(),contact:z.boolean(),ecommerce:z.boolean(),seo:z.boolean()})})
export const proposalSchema=z.object({service:z.string().trim().min(2).max(120),investment:z.coerce.number().nonnegative().max(1000000000),timeline:z.string().trim().min(2).max(80),taxRate:z.coerce.number().min(0).max(100)})
export function cleanText(value:unknown,max=2000){return String(value??'').replace(/[<>]/g,'').trim().slice(0,max)}
