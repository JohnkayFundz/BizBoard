import { Users, BriefcaseBusiness, BarChart3, Check, Bell } from 'lucide-react'
import { Metric, FollowupCard } from './Ui'

export function DashboardSummary({metrics,followUps,openActivity,money}){return (<>
<section className="metrics"><Metric icon={<Users/>} label="Total leads" value={metrics.total}/><Metric icon={<BriefcaseBusiness/>} label="Active pipeline" value={metrics.active}/><Metric icon={<BarChart3/>} label="Pipeline value" value={money(metrics.pipeline)}/><Metric icon={<Check/>} label="Won value" value={money(metrics.won)}/><Metric icon={<Bell/>} label="Follow-ups due" value={metrics.due}/></section>
 
<section className="followups"><div className="panelHead"><div><h2>Follow-up focus</h2><p>Prioritize the prospects that need your attention next.</p></div><span>{followUps.overdue.length+followUps.today.length} need attention</span></div><div className="followupGrid"><FollowupCard title="Overdue" items={followUps.overdue} empty="Nothing overdue" tone="overdue" onActivity={openActivity}/><FollowupCard title="Due today" items={followUps.today} empty="Nothing due today" tone="today" onActivity={openActivity}/><FollowupCard title="Upcoming" items={followUps.upcoming} empty="No upcoming follow-ups" tone="upcoming" onActivity={openActivity}/></div></section>
 
</>)}
