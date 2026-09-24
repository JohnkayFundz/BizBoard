import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'

export interface LeadSummary {
  id: string | number
  company?: string | null
  contact_name?: string | null
  status?: string | null
  next_follow_up?: string | null
}

interface MetricProps {
  icon: ReactNode
  label: string
  value: ReactNode
  meta?: string
  tone?: 'default' | 'accent' | 'success'
}

export function Metric({ icon, label, value, meta, tone = 'default' }: MetricProps) {
  return (
    <article className={`metric metric-${tone}`}>
      <div className="metricIcon" aria-hidden="true">{icon}</div>
      <div className="metricContent">
        <div className="metricLabel"><small>{label}</small><span className="metricMeta">{meta}</span></div>
        <strong>{value}</strong>
      </div>
    </article>
  )
}

interface SelectProps {
  icon?: ReactNode
  value: string
  set: (value: string) => void
  options: string[]
  ariaLabel?: string
}

export function Select({ icon, value, set, options, ariaLabel }: SelectProps) {
  return (
    <label className="selectField">
      <span className="selectIcon" aria-hidden="true">{icon}</span>
      <select aria-label={ariaLabel} value={value} onChange={e => set(e.target.value)}>
        {options.map(option => <option key={option}>{option}</option>)}
      </select>
      <ChevronDown aria-hidden="true" />
    </label>
  )
}

interface FollowupCardProps {
  title: string
  items: LeadSummary[]
  empty: string
  tone: 'overdue' | 'today' | 'upcoming'
  onActivity: (lead: LeadSummary) => void
}

export function FollowupCard({ title, items, empty, tone, onActivity }: FollowupCardProps) {
  return (
    <article className={`followupCard ${tone}`}>
      <div className="followupTitle"><strong>{title}</strong><span>{items.length}</span></div>
      {items.length ? items.map(lead => (
        <button className="followupItem" key={lead.id} onClick={() => onActivity(lead)}>
          <span><b>{lead.company || 'Untitled lead'}</b><small>{lead.contact_name || 'No contact name'} · {lead.status || 'New Lead'}</small></span>
          <time>{lead.next_follow_up || '—'}</time>
        </button>
      )) : <div className="followupEmpty">{empty}</div>}
    </article>
  )
}
