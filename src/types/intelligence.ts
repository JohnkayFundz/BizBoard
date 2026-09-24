export type IntelligenceReportType = 'audit' | 'new_website'
export type RecommendedService = 'Business Website' | 'E-commerce Website' | 'Website Redesign' | 'Custom Web Application' | 'React/MERN Development'

export interface IntelligenceChecklist {
  mobile: boolean
  cta: boolean
  contact: boolean
  ecommerce: boolean
  seo: boolean
}

export interface IntelligenceReport {
  id: number
  leadId: number
  websiteUrl: string | null
  score: number
  checklist: IntelligenceChecklist
  keyFindings: string[]
  keyOpportunities: string[]
  recommendedService: RecommendedService
  estimatedValue: number
  reportType: IntelligenceReportType
  createdAt: string
}
