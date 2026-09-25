import { Search, Filter, ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, Plus, Users, Trash2, Mail, Phone, Instagram, Globe2, MessageCircle, History, Pencil } from 'lucide-react'
import { Select } from './Ui'
import { calculateLeadScore } from '../utils/leadScoring'

interface Lead {
  id: string | number
  company?: string | null
  contact_name?: string | null
  niche?: string | null
  status?: string | null
  deal_value?: number | string | null
  next_follow_up?: string | null
  source?: string | null
  email?: string | null
  phone?: string | null
  instagram?: string | null
  website?: string | null
  score?: number | null
  score_tier?: string | null
}

interface Props {
  filtered: Lead[]
  sorted: Lead[]
  paged: Lead[]
  safePage: number
  setPage: (updater: (current: number) => number) => void
  pageCount: number
  pageSize: number
  query: string
  setQuery: (value: string) => void
  status: string
  setStatus: (value: string) => void
  source: string
  setSource: (value: string) => void
  sources: string[]
  stages: string[]
  tone: Record<string, string>
  sortBy: (key: string) => void
  sortKey: string
  move: (lead: Lead, stage: string) => void
  today: () => string
  money: (value: number | string | null | undefined) => string
  contactAction: (lead: Lead, type: string) => void
  openActivity: (lead: Lead) => void
  edit: (lead: Lead) => void
  remove: (id: string | number) => void
  setForm: (value: Record<string, unknown>) => void
  setModal: (value: boolean) => void
  selectedIds: Array<string | number>
  setSelectedIds: (ids: Array<string | number>) => void
  onGenerateCampaign: () => void
  empty: Record<string, unknown>
}

export function LeadPipeline({ filtered, sorted, paged, safePage, setPage, pageCount, pageSize, query, setQuery, status, setStatus, source, setSource, sources, stages, tone, sortBy, sortKey, move, today, money, contactAction, openActivity, edit, remove, setForm, setModal, empty }: Props) {
  const hasFilters = Boolean(query.trim() || status !== 'All' || source !== 'All')
  return (
    <section className="panel pipelinePanel" id="leads" aria-labelledby="pipeline-heading">
      <div className="panelHead panelHeadStack">
        <div><span className="eyebrow">CRM PIPELINE</span><h2 id="pipeline-heading">Lead pipeline</h2><p>Search, qualify and manage prospects from one screen.</p></div>
        <span className="panelBadge"><Users aria-hidden="true" />{filtered.length} visible</span>
      </div>

      <div className="toolbar" role="search">
        <label className="searchField">
          <Search aria-hidden="true" />
          <span className="srOnly">Search leads</span>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search company, person, niche…" />
        </label>
        <Select icon={<Filter />} value={status} set={setStatus} options={['All', ...stages]} ariaLabel="Filter by stage" />
        <Select value={source} set={setSource} options={['All', ...sources]} ariaLabel="Filter by source" />
        <Select value={sortKey === 'score' ? 'Lead score (High → Low)' : 'Latest updated'} set={value => sortBy(value === 'Lead score (High → Low)' ? 'score' : 'updated_at')} options={['Latest updated', 'Lead score (High → Low)']} ariaLabel="Sort leads" />
      </div>

      <div className="table">
        <table>
          <thead><tr>
            <th><button className="sortHead" onClick={() => sortBy('company')}>Lead <ArrowUpDown /></button></th>
            <th><button className="sortHead" onClick={() => sortBy('status')}>Stage <ArrowUpDown /></button></th>
            <th><button className="sortHead" onClick={() => sortBy('score')}>Score <ArrowUpDown /></button></th>
            <th><button className="sortHead" onClick={() => sortBy('deal_value')}>Potential <ArrowUpDown /></button></th>
            <th><button className="sortHead" onClick={() => sortBy('next_follow_up')}>Follow-up <ArrowUpDown /></button></th>
            <th>Source</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {paged.map(lead => {
              const stage = lead.status || 'New Lead'
              const score=lead.score ?? calculateLeadScore(lead).score
              const tier=lead.score_tier || calculateLeadScore(lead).scoreTier
              const due = Boolean(lead.next_follow_up && lead.next_follow_up <= today() && !['Won', 'Lost'].includes(stage))
              return (
                <tr key={lead.id}>
                  <td data-label="Lead"><div className="lead"><b className="leadAvatar" aria-hidden="true">{(lead.company || '?')[0].toUpperCase()}</b><span className="leadCopy"><strong title={lead.company || 'Untitled lead'}>{lead.company || 'Untitled lead'}</strong><small title={[lead.contact_name?.trim(), lead.niche?.trim()].filter(Boolean).join(' · ')}>{[lead.contact_name?.trim(), lead.niche?.trim()].filter(Boolean).join(' · ') || 'No contact name'}</small></span></div></td>
                  <td data-label="Stage"><div className="stageControl"><select className={`stage ${tone[stage] || 'blue'}`} aria-label={`Stage for ${lead.company || 'lead'}`} value={stage} onChange={e => move(lead, e.target.value)}>{stages.map(item => <option key={item}>{item}</option>)}</select><ChevronDown aria-hidden="true" /></div></td>
                  <td data-label="Score"><span className={`scoreBadge score-${tier.toLowerCase()}`} title={`Lead score: ${score}/100`}>{tier==='Hot'?'🔥':tier==='Warm'?'⚡':'❄️'} <b>{score}</b></span></td>
                  <td data-label="Potential"><strong>{money(lead.deal_value)}</strong></td>
                  <td data-label="Follow-up" className={due ? 'due' : ''}>{lead.next_follow_up || '—'}</td>
                  <td data-label="Source"><span className="pill">{lead.source || 'Manual'}</span></td>
                  <td data-label="Actions">
                    <div className="actions">
                      <button onClick={() => contactAction(lead, 'Email')} disabled={!lead.email} title="Email lead" aria-label="Email lead"><Mail /></button>
                      <button onClick={() => contactAction(lead, 'Call')} disabled={!lead.phone} title="Call lead" aria-label="Call lead"><Phone /></button>
                      <button onClick={() => contactAction(lead, 'Instagram')} disabled={!lead.instagram} title="Open Instagram" aria-label="Open Instagram"><Instagram /></button>
                      <button onClick={() => contactAction(lead, 'WhatsApp')} disabled={!lead.phone} title="Open WhatsApp" aria-label="Open WhatsApp"><MessageCircle /></button>
                      <button onClick={() => contactAction(lead, 'Website')} disabled={!lead.website} title="Open website" aria-label="Open website"><Globe2 /></button>
                      <button onClick={() => openActivity(lead)} title="Open activity history" aria-label="Open activity history"><History /></button>
                      <button onClick={() => edit(lead)} title="Edit lead" aria-label="Edit lead"><Pencil /></button>
                      <button className="dangerAction" onClick={() => remove(lead.id)} title="Delete lead" aria-label="Delete lead"><Trash2 /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {!filtered.length && <tr><td colSpan={8}><div className="empty">{hasFilters?<><Search/><strong>No matching leads</strong><span>Try a different search term or clear one of the pipeline filters.</span><button className="secondary" onClick={() => { setQuery(''); setStatus('All'); setSource('All') }}>Clear filters</button></>:<><Users/><strong>No leads yet</strong><span>Add your first prospect and start tracking the conversation.</span><button className="primary" onClick={() => { setForm({ ...empty }); setModal(true) }}><Plus />Add first lead</button></>}</div></td></tr>}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <span>Showing {sorted.length ? ((safePage - 1) * pageSize + 1) : 0}–{Math.min(safePage * pageSize, sorted.length)} of {sorted.length}</span>
        <div><button className="secondary" onClick={() => setPage(current => Math.max(1, current - 1))} disabled={safePage === 1} aria-label="Previous page"><ChevronLeft />Previous</button><b>Page {safePage} / {pageCount}</b><button className="secondary" onClick={() => setPage(current => Math.min(pageCount, current + 1))} disabled={safePage === pageCount} aria-label="Next page">Next<ChevronRight /></button></div>
      </div>
    </section>
  )
}
