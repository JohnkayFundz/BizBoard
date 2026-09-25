import type { IntelligenceAssessment, IntelligenceChecks } from '../types/crm'

export const EMPTY_INTELLIGENCE_CHECKS: IntelligenceChecks = {
  mobile: false,
  cta: false,
  contact: false,
  ecommerce: false,
  seo: false,
}

export function assessIntelligence(checks: IntelligenceChecks, hasWebsite: boolean): IntelligenceAssessment {
  const score = Object.values(checks).filter(Boolean).length
  if (!hasWebsite) {
    return {
      score,
      checks,
      recommendedService: checks.ecommerce ? 'E-commerce Website' : 'Business Website',
      estimatedValue: checks.ecommerce ? 250000 : 150000,
      mode: 'new-website',
    }
  }
  const recommendedService = checks.ecommerce
    ? 'E-commerce Website'
    : score <= 2
      ? 'Website Redesign'
      : 'Business Website'
  return {
    score,
    checks,
    recommendedService,
    estimatedValue: recommendedService === 'E-commerce Website' ? 250000 : recommendedService === 'Website Redesign' ? 120000 : 150000,
    mode: 'website',
  }
}

export function normalizeWebsiteUrl(value: string): string {
  const raw = value.trim()
  if (!raw) return ''
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  const parsed = new URL(candidate)
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Use an HTTP or HTTPS website URL')
  const pathname = parsed.pathname.replace(/\/+$/, '')
  return `${parsed.hostname.toLowerCase()}${pathname}`
}
