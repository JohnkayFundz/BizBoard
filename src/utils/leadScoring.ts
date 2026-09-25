export type LeadScoreTier = 'Hot' | 'Warm' | 'Cold'

export interface ScorableLead {
  company?: string | null
  contact_name?: string | null
  email?: string | null
  phone?: string | null
  instagram?: string | null
  website?: string | null
  website_status?: string | null
  website_outdated?: boolean | null
  niche?: string | null
  deal_value?: number | string | null
  status?: string | null
}

export interface LeadScore {
  score: number
  scoreTier: LeadScoreTier
}

const HIGH_VALUE_NICHE = /real\s*estate|property|properties|e[-\s]?commerce|hospitality|hotel|restaurant|food|tech|technology|software|saas|fintech|electronics/i
const ENGAGED_STAGES = new Set(['Replied', 'Interested', 'Proposal Sent'])

export function calculateLeadScore(lead: ScorableLead): LeadScore {
  let score = 0
  const website = String(lead.website ?? '').trim()
  const websiteStatus = String(lead.website_status ?? '').toLowerCase().trim()

  if (!website || lead.website_outdated === true || websiteStatus === 'outdated') score += 25
  if ([lead.phone, lead.email, lead.instagram].some(value => String(value ?? '').trim())) score += 20
  if (HIGH_VALUE_NICHE.test(String(lead.niche ?? ''))) score += 20
  if (Number(lead.deal_value ?? 0) >= 150000) score += 15
  if (ENGAGED_STAGES.has(String(lead.status ?? ''))) score += 20

  const bounded = Math.max(0, Math.min(100, score))
  const scoreTier: LeadScoreTier = bounded >= 70 ? 'Hot' : bounded >= 40 ? 'Warm' : 'Cold'
  return { score: bounded, scoreTier }
}
