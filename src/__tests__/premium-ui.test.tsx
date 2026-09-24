import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Metric } from '../components/Ui'
import { LeadPipeline } from '../components/LeadPipeline'

describe('premium UI primitives', () => {
  it('renders a KPI metric with its supporting metadata', () => {
    render(<Metric icon={<span>icon</span>} label="Active pipeline" value="₦250,000" meta="Open opportunities" />)
    expect(screen.getByText('Active pipeline')).toBeInTheDocument()
    expect(screen.getByText('₦250,000')).toBeInTheDocument()
    expect(screen.getByText('Open opportunities')).toBeInTheDocument()
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
          page={1}
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
