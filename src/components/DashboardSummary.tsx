import { Users, BriefcaseBusiness, BarChart3, Check, Bell, ArrowUpRight } from 'lucide-react'
import { Metric, FollowupCard, type LeadSummary } from './Ui'

interface Metrics {
  total: number
  active: number
  pipeline: number
  won: number
  due: number
}

interface FollowUps {
  overdue: LeadSummary[]
  today: LeadSummary[]
  upcoming: LeadSummary[]
}

interface Props {
  metrics: Metrics
  followUps: FollowUps
  openActivity: (lead: LeadSummary) => void
  money: (value: number) => string
}

export function DashboardSummary({ metrics, followUps, openActivity, money }: Props) {
  return (
    <>
      <section className="metrics" aria-label="Pipeline summary">
        <Metric icon={<Users />} label="Total leads" value={metrics.total} meta="Live records" />
        <Metric icon={<BriefcaseBusiness />} label="Active pipeline" value={metrics.active} meta="Open opportunities" tone="accent" />
        <Metric icon={<BarChart3 />} label="Open Value" value={money(metrics.pipeline)} meta="Active opportunities" tone="accent" />
        <Metric icon={<Check />} label="Closed Revenue" value={money(metrics.won)} meta="Won opportunities" tone="success" />
        <Metric icon={<Bell />} label="Follow-ups due" value={metrics.due} meta={metrics.due ? 'Needs attention' : 'All clear'} tone={metrics.due ? 'accent' : 'success'} />
      </section>

      <section className="followups" aria-labelledby="followup-heading">
        <div className="panelHead">
          <div><span className="eyebrow">WORK QUEUE</span><h2 id="followup-heading">Follow-up focus</h2><p>Prioritize the prospects that need your attention next.</p></div>
          <span className="panelBadge"><ArrowUpRight aria-hidden="true" />{followUps.overdue.length + followUps.today.length} need attention</span>
        </div>
        <div className="followupGrid">
          <FollowupCard title="Overdue" items={followUps.overdue} empty="Nothing overdue" tone="overdue" onActivity={openActivity} />
          <FollowupCard title="Due today" items={followUps.today} empty="Nothing due today" tone="today" onActivity={openActivity} />
          <FollowupCard title="Upcoming" items={followUps.upcoming} empty="No upcoming follow-ups" tone="upcoming" onActivity={openActivity} />
        </div>
      </section>
    </>
  )
}
