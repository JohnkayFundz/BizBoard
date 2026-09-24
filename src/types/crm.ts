export type LeadStage = 'New Lead' | 'Contacted' | 'Replied' | 'Interested' | 'Proposal Sent' | 'Won' | 'Lost'

export interface IntelligenceChecks {
  mobile: boolean
  cta: boolean
  contact: boolean
  ecommerce: boolean
  seo: boolean
}

export interface IntelligenceAssessment {
  score: number
  checks: IntelligenceChecks
  recommendedService: string
  estimatedValue: number
  mode: 'website' | 'new-website'
}
