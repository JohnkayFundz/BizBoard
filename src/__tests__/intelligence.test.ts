import { describe, expect, it } from 'vitest'
import { assessIntelligence, normalizeWebsiteUrl } from '../utils/intelligence'
import { formatNaira } from '../utils/formatters'

const checks = (overrides: Partial<Record<'mobile'|'cta'|'contact'|'ecommerce'|'seo', boolean>> = {}) => ({
  mobile: false, cta: false, contact: false, ecommerce: false, seo: false, ...overrides,
})

describe('Lead Intelligence business rules', () => {
  it.each([
    [0, checks(), 0],
    [1, checks({ mobile: true }), 1],
    [2, checks({ mobile: true, cta: true }), 2],
    [3, checks({ mobile: true, cta: true, contact: true }), 3],
    [4, checks({ mobile: true, cta: true, contact: true, ecommerce: true }), 4],
    [5, checks({ mobile: true, cta: true, contact: true, ecommerce: true, seo: true }), 5],
  ])('scores %s/5 from the checklist', (_expected, input, expectedScore) => {
    expect(assessIntelligence(input, true).score).toBe(expectedScore)
  })

  it('treats a prospect without a website as a new website opportunity', () => {
    const result = assessIntelligence(checks({ ecommerce: true }), false)
    expect(result.mode).toBe('new-website')
    expect(result.recommendedService).toBe('E-commerce Website')
    expect(result.estimatedValue).toBe(250000)
  })

  it('normalizes bare domains and preserves https URLs', () => {
    expect(normalizeWebsiteUrl('example.com')).toBe('https://example.com')
    expect(normalizeWebsiteUrl('https://example.com/')).toBe('https://example.com')
  })

  it('rejects unsupported URL protocols', () => {
    expect(() => normalizeWebsiteUrl('ftp://example.com')).toThrow()
  })

  it('formats Nigerian Naira without decimal noise', () => {
    expect(formatNaira(250000)).toBe('₦250,000')
    expect(formatNaira(0)).toBe('₦0')
  })
})
