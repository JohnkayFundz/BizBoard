import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Metric } from '../components/Ui'
import { LeadPipeline } from '../components/LeadPipeline'
import { ActionCenter } from '../components/ActionCenter'
import { assessIntelligence } from '../utils/intelligence'
import { calculatePipelineMetrics, findPotentialDuplicateLeads, findLeadDuplicate } from '../utils/pipeline'
import { calculateLeadScore } from '../utils/leadScoring'
import { buildMailtoUrl, buildWhatsAppUrl, buildInstagramInboxUrl, normalizeWhatsAppPhone } from '../utils/outreach'

describe('premium UI primitives', () => {
  it('renders a KPI metric with its supporting metadata', () => {
    render(<Metric icon={<span>icon</span>} label="Active pipeline" value="₦250,000" meta="Open opportunities" />)
    expect(screen.getByText('Active pipeline')).toBeInTheDocument()
    expect(screen.getByText('₦250,000')).toBeInTheDocument()
    expect(screen.getByText('Open opportunities')).toBeInTheDocument()
  })

  it('keeps new-website opportunity scoring separate from service pricing logic', () => {
    const emptyChecks = { mobile: false, cta: false, contact: false, ecommerce: false, seo: false }
    const assessment = assessIntelligence(emptyChecks, false)

    expect(assessment.mode).toBe('new-website')
    expect(assessment.score).toBe(0)
    expect(assessment.recommendedService).toBe('Business Website')
    expect(assessment.estimatedValue).toBe(150000)
  })

  it('calculates open value and closed revenue from live lead values', () => {
    const metrics = calculatePipelineMetrics([
      { status: 'New Lead', deal_value: 30000, next_follow_up: '' },
      { status: 'Interested', deal_value: 120000, next_follow_up: '' },
      { status: 'Won', deal_value: 150000, next_follow_up: '' },
      { status: 'Lost', deal_value: 50000, next_follow_up: '' },
    ], '2026-09-24')

    expect(metrics.active).toBe(2)
    expect(metrics.pipeline).toBe(150000)
    expect(metrics.won).toBe(150000)
  })

  it('maps pipeline metrics into the Action Center without dropping revenue values', () => {
    render(
      <ActionCenter
        leads={[{ id: 1, company: 'Gbemi Closet', status: 'Contacted' }]}
        metrics={{ active: 1, pipeline: 150000, won: 0, due: 0 }}
        followUps={{ overdue: [], today: [], upcoming: [] }}
        openActivity={() => {}}
        openOutreach={() => {}}
        setForm={() => {}}
        setModal={() => {}}
        empty={{}}
        money={(value) => `₦${value.toLocaleString('en-NG')}`}
      />
    )
    expect(screen.getByText('₦150,000')).toBeInTheDocument()
    expect(screen.getByText('1 active leads')).toBeInTheDocument()
  })

  it('flags likely duplicate leads by normalized contact identity', () => {
    const duplicates = findPotentialDuplicateLeads([
      { id: 1, company: 'Acme Ltd', email: 'OWNER@ACME.COM', phone: '08012345678' },
      { id: 2, company: 'Acme Ltd', email: 'owner@acme.com', phone: '08012345678' },
      { id: 3, company: 'Different Co', email: 'other@example.com', phone: '' },
    ])

    expect(duplicates).toHaveLength(1)
    expect(duplicates[0].ids).toEqual([1, 2])
  })

  it('calculates a bounded hot lead score from the requested qualification signals', () => {
    expect(calculateLeadScore({
      website: '',
      email: 'owner@example.com',
      niche: 'Real Estate',
      deal_value: 150000,
      status: 'Interested',
    })).toEqual({ score: 100, scoreTier: 'Hot' })
    expect(calculateLeadScore({ website: 'example.com', niche: 'Local Shop', status: 'New Lead' })).toEqual({ score: 0, scoreTier: 'Cold' })
  })

  it('detects duplicates by normalized website or company and contact name', () => {
    const leads = [{ id: 1, company: 'Acme Ltd', contact_name: 'Jane Doe', website: 'https://example.com/' }]
    expect(findLeadDuplicate(leads, { company: 'Other', contact_name: 'Owner', website: 'example.com' })).toEqual({ reason: 'website', leadId: 1 })
    expect(findLeadDuplicate(leads, { company: 'ACME LTD', contact_name: 'jane doe', website: '' })).toEqual({ reason: 'company_contact', leadId: 1 })
  })

  it('builds encoded outreach deep links and normalizes Nigerian phone numbers', () => {
    expect(normalizeWhatsAppPhone('+234 801-234-5678')).toBe('2348012345678')
    expect(buildWhatsAppUrl('08012345678', 'Hello John & welcome')).toBe('https://wa.me/2348012345678?text=Hello%20John%20%26%20welcome')
    expect(buildMailtoUrl('owner@example.com', 'Quick idea', 'Hello & welcome')).toBe('mailto:owner@example.com?subject=Quick%20idea&body=Hello%20%26%20welcome')
    expect(buildInstagramInboxUrl()).toBe('https://instagram.com/direct/inbox/')
  })

  it('supports keyboard-friendly pipeline filtering', async () => {
    const user = userEvent.setup()

    function Harness() {
      const [query, setQuery] = useState('')
      const lead = { id: 1, company: 'Gbemi Closet', status: 'Interested', deal_value: 250000, source: 'Manual' }
      return (
        <LeadPipeline
          filtered={[lead]}
          sorted={[lead]}
          paged={[lead]}
          safePage={1}
          setPage={() => {}}
          pageCount={1}
          pageSize={10}
          query={query}
          setQuery={setQuery}
          status="All"
          setStatus={() => {}}
          source="All"
          setSource={() => {}}
          sources={['Manual']}
          stages={['New Lead', 'Contacted', 'Interested']}
          tone={{ Interested: 'amber' }}
          sortBy={() => {}}
          sortKey="updated_at"
          move={() => {}}
          today={() => '2026-09-24'}
          money={() => '₦250,000'}
          contactAction={() => {}}
          openActivity={() => {}}
          edit={() => {}}
          remove={() => {}}
          setForm={() => {}}
          setModal={() => {}}
          empty={{}}
        />
      )
    }

    render(<Harness />)
    const search = screen.getByPlaceholderText('Search company, person, niche…')
    await user.type(search, 'Gbemi')
    expect(search).toHaveValue('Gbemi')
  })
})
