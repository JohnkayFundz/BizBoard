import { describe, expect, it } from 'vitest'
import { normalizeContactAddresses } from '../utils/contactIntel'

describe('normalizeContactAddresses', () => {
  it('keeps the longer structured address when entries overlap', () => {
    const result = normalizeContactAddresses([
      'Olajide Avenue, Behind Gtb Bank, Ojodu Berger Ikeja Lagos State Nigeria',
      'No 8, Olajide Avenue, Behind Gtb Bank, Ojodu Berger Ikeja Lagos State Nigeria',
    ])

    expect(result).toEqual([
      'No 8, Olajide Avenue, Behind Gtb Bank, Ojodu Berger, Ikeja, Lagos State, Nigeria',
    ])
  })

  it('removes embedded contact metadata and normalizes line breaks', () => {
    const result = normalizeContactAddresses([
      'No 8, Olajide Avenue, Behind Gtb Bank, Ojodu Berger\nIkeja Lagos State Nigeria Phone: 08033736980, 07040133951 [email protected] CONNECT',
    ])

    expect(result).toEqual([
      'No 8, Olajide Avenue, Behind Gtb Bank, Ojodu Berger, Ikeja, Lagos State, Nigeria',
    ])
  })

  it('deduplicates near-identical entries while preserving distinct streets', () => {
    const result = normalizeContactAddresses([
      'No 8, Olajide Avenue, Behind Gtb Bank, Ojodu Berger, Ikeja, Lagos State, Nigeria',
      'No 8 Olajide Avenue Behind GTB Bank Ojodu Berger Ikeja Lagos State Nigeria',
      '12 Allen Avenue, Ikeja, Lagos State, Nigeria',
    ])

    expect(result).toHaveLength(2)
    expect(result).toContain('No 8, Olajide Avenue, Behind Gtb Bank, Ojodu Berger, Ikeja, Lagos State, Nigeria')
    expect(result).toContain('12 Allen Avenue, Ikeja, Lagos State, Nigeria')
  })
})
