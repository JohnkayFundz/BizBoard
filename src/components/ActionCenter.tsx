import { Bell, CalendarClock, CheckCircle2, MessageSquare, Target, TrendingUp } from 'lucide-react'
import { calculateLeadScore } from '../utils/leadScoring'

type Lead = {
  id: string | number
  company?: string | null
  status?: string | null
  next_follow_up?: string | null
  email?: string | null
  instagram?: string | null
  phone?: string | null
  website?: string | null
  niche?: string | null
  deal_value?: number | string | null
  score?: number | null
  score_tier?: string | null
}

type Metrics = {
  active?: number
  pipeline?: number
  won?: number
  due?: number
}

type FollowUps = {
  overdue?: Lead[]
  today?: Lead[]
  upcoming?: Lead[]
}

type ActionCenterProps = {
  leads: Lead[]
  metrics?: Metrics
  followUps?: FollowUps
  openActivity: (lead: Lead) => void
  openOutreach: (lead: Lead) => void
  setForm: (value: Record<string, unknown>) => void
  setModal: (value: boolean) => void
  empty: Record<string, unknown>
  money: (value: number) => string
}

export function ActionCenter({ leads, metrics, followUps, openActivity, openOutreach, setForm, setModal, empty, money }: ActionCenterProps) {
  const overdue: Lead[] = followUps?.overdue || []
  const today: Lead[] = followUps?.today || []
  const activeNeedingAction = leads
    .filter(lead => !['Won', 'Lost'].includes(lead.status || 'New Lead'))
    .filter(lead => ['New Lead', 'Contacted', 'Replied', 'Interested', 'Proposal Sent'].includes(lead.status || 'New Lead'))
    .map(lead => ({ lead, score: lead.score ?? calculateLeadScore(lead).score, tier: lead.score_tier || calculateLeadScore(lead).scoreTier }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  const priority = activeNeedingAction.map(({ lead, score, tier }) => ({
    lead,
    score,
    tier,
    label: lead.next_follow_up ? (lead.next_follow_up <= new Date().toISOString().slice(0, 10) ? 'Follow-up due' : 'Follow-up scheduled') : lead.status === 'Proposal Sent' ? 'Proposal follow-up' : lead.status === 'Interested' ? 'Interested lead' : 'Outreach needed',
    tone: tier === 'Hot' ? 'danger' : tier === 'Warm' ? 'warning' : 'neutral'
  }))

  const actionCount = overdue.length + today.length
  const pipelineValue = Number(metrics?.pipeline || 0)

  return (
    <section className="panel actionCenter">
      <div className="panelHead panelHeadStack">
        <div>
          <div className="eyebrow">TODAY'S FOCUS</div>
          <h2>Next best actions</h2>
          <p>Keep the sales workflow moving without guessing what to do next.</p>
        </div>
        <span className="panelBadge"><Target /> {priority.length ? `Top ${priority.length} by score` : 'All clear'}</span>
      </div>

      <div className="actionStats">
        <div><span><Bell /> Follow-ups</span><strong>{actionCount}</strong><small>{overdue.length ? `${overdue.length} overdue` : 'Nothing overdue'}</small></div>
        <div><span><TrendingUp /> Open pipeline</span><strong>{money(pipelineValue)}</strong><small>{metrics?.active || 0} active leads</small></div>
        <div><span><CheckCircle2 /> Closed revenue</span><strong>{money(metrics?.won || 0)}</strong><small>Won deals</small></div>
      </div>

      <div className="actionBody">
        <div className="actionList">
          {priority.length ? priority.map(({ lead, label, tone }) => (
            <div className={`actionItem action-${tone}`} key={lead.id}>
              <div className="actionScore"><span className={`scoreBadge score-${tier.toLowerCase()}`}>{tier==='Hot'?'🔥':tier==='Warm'?'⚡':'❄️'} <b>{score}</b></span></div><div className="actionIcon">{label.includes('follow-up') || label.includes('Due') ? <CalendarClock /> : <MessageSquare />}</div>
              <div className="actionMain">
                <strong>{(lead.company || 'Unnamed lead').replace(/\\s*[—-]\\s*Website\\s*$/i, '')}</strong>
                <small>{label}{lead.next_follow_up ? ` · ${lead.next_follow_up}` : ''} · Score {score}</small>
              </div>
              <div className="actionButtons">
                <button className="secondary" onClick={() => openActivity(lead)}>Activity</button>
                {lead.email || lead.instagram || lead.phone ? <button className="primary" onClick={() => openOutreach(lead)}>Outreach</button> : null}
              </div>
            </div>
          )) : (
            <div className="actionEmpty">
              <CheckCircle2 />
              <strong>No urgent actions right now</strong>
              <span>Add a lead or review the pipeline when you're ready.</span>
              <button className="primary" onClick={() => { setForm({ ...empty }); setModal(true) }}>Add a lead</button>
            </div>
          )}
        </div>

        <div className="actionFooter">
          <span>{followUps?.upcoming?.length || 0} upcoming follow-ups scheduled</span>
          <button className="secondary" onClick={() => document.getElementById('leads')?.scrollIntoView({ behavior: 'smooth' })}>Review pipeline</button>
        </div>
      </div>
    </section>
  )
}
