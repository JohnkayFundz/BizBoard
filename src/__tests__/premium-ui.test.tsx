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
    render(
      <LeadPipeline
        filtered={[{ id: 1, company: 'Gbemi Closet', status: 'Interested', deal_value: 250000, source: 'Manual' }]}
        sorted={[{ id: 1, company: 'Gbemi Closet', status: 'Interested', deal_value: 250000, source: 'Manual' }]}
        paged={[{ id: 1, company: 'Gbemi Closet', status: 'Interested', deal_value: 250000, source: 'Manual' }]}
        safePage={1} page={1} setPage={() => {}} pageCount={1} pageSize={10}
        query="" setQuery={() => {}} status="All" setStatus={() => {}} source="All" setSource={() => {}}
        sources={['Manual']} stages={['New Lead', 'Contacted', 'Interested']} tone={{ Interested: 'amber' }}
        sortBy={() => {}} move={() => {}} today={() => '2026-09-24'} money={() => '₦250,000'}
        contactAction={() => {}} openActivity={() => {}} edit={() => {}} remove={() => {}}
        setForm={() => {}} setModal={() => {}} empty={{}}
      />,
    )
    const search = screen.getByPlaceholderText('Search company, person, niche…')
    await user.click(search)
    await user.keyboard('Gbemi')
    expect(search).toHaveValue('Gbemi')
    expect(screen.getByText('Gbemi Closet')).toBeInTheDocument()
  })
})
