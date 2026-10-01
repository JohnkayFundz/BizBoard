import { CalendarClock, RefreshCw } from 'lucide-react'

interface FollowUpLead {
  id: string | number
  company?: string | null
  niche?: string | null
  opportunity_type?: string | null
  deal_value?: number | string | null
  status?: string | null
  outreach_status?: string | null
  next_followup_date?: string | null
  next_follow_up?: string | null
  followup_count?: number | null
  last_interaction_notes?: string | null
  email?: string | null
}

interface Props {
  leads: FollowUpLead[]
  onSelectLead: (lead: FollowUpLead) => void
  onRefresh?: () => void | Promise<unknown>
  money: (value: number | string | null | undefined) => string
}

function dateKey(value: string | null | undefined) {
  if (!value) return null
  return value.slice(0, 10)
}

function todayInLagos() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function dateLabel(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('en-NG', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(year, month - 1, day))
}

export function FollowUpQueue({ leads, onSelectLead, onRefresh, money }: Props) {
  const today = todayInLagos()
  const queue = leads
    .filter(lead => lead.status === 'Contacted' && Boolean(dateKey(lead.next_followup_date || lead.next_follow_up)))
    .map(lead => ({ ...lead, followupDate: dateKey(lead.next_followup_date || lead.next_follow_up)! }))
    .sort((a, b) => a.followupDate.localeCompare(b.followupDate))

  const groups = queue.reduce<Record<string, typeof queue>>((acc, lead) => {
    ;(acc[lead.followupDate] ||= []).push(lead)
    return acc
  }, {})

  const groupEntries = Object.entries(groups)

  return (
    <section className="panel followupQueuePanel" id="follow-up-queue" aria-labelledby="follow-up-queue-heading">
      <div className="panelHead panelHeadStack">
        <div>
          <span className="eyebrow">FOLLOW-UP ENGINE</span>
          <h2 id="follow-up-queue-heading">Follow-up Queue</h2>
          <p>{queue.length} contacted leads scheduled for the next outreach touch.</p>
        </div>
        <div className="followupQueueActions">
          <span className="panelBadge"><CalendarClock aria-hidden="true" />{queue.length} scheduled</span>
          {onRefresh && (
            <button className="secondary" type="button" onClick={() => void onRefresh()}>
              <RefreshCw aria-hidden="true" />Refresh
            </button>
          )}
        </div>
      </div>

      {!queue.length ? (
        <div className="empty followupQueueEmpty">
          <CalendarClock aria-hidden="true" />
          <strong>No pending follow-ups</strong>
          <span>Contacted leads with a scheduled next touch will appear here.</span>
        </div>
      ) : (
        <div className="followupQueueGroups">
          {groupEntries.map(([scheduledDate, group]) => {
            const isToday = scheduledDate === today
            const isOverdue = scheduledDate < today
            const badgeClass = isOverdue ? 'followupDueBadge overdue' : isToday ? 'followupDueBadge today' : 'followupDueBadge upcoming'
            const badgeLabel = isOverdue ? 'Overdue' : isToday ? 'Due today' : 'Scheduled'

            return (
              <div className="followupQueueGroup" key={scheduledDate}>
                <div className="followupQueueGroupHead">
                  <div>
                    <strong>{dateLabel(scheduledDate)}</strong>
                    <span>{group.length} {group.length === 1 ? 'lead' : 'leads'}</span>
                  </div>
                  <span className={badgeClass}>{badgeLabel}</span>
                </div>

                <div className="followupQueueList">
                  {group.map(lead => (
                    <article className="followupQueueItem" key={lead.id}>
                      <div className="followupQueueLead">
                        <div className="lead">
                          <b className="leadAvatar" aria-hidden="true">{(lead.company || '?')[0].toUpperCase()}</b>
                          <span className="leadCopy">
                            <strong>{lead.company || 'Untitled lead'}</strong>
                            <small>{[lead.niche, lead.email].filter(Boolean).join(' · ') || 'No contact details'}</small>
                          </span>
                        </div>
                        <div className="followupQueueMeta">
                          <span>{lead.opportunity_type || 'Follow-up'}</span>
                          <strong>{money(lead.deal_value)}</strong>
                          <span>Touchpoint #{Number(lead.followup_count || 0) + 1}</span>
                        </div>
                        {lead.last_interaction_notes && (
                          <p className="followupQueueNote">“{lead.last_interaction_notes}”</p>
                        )}
                      </div>
                      <button
                        className="primary followupPrepareButton"
                        type="button"
                        onClick={() => onSelectLead(lead)}
                      >
                        Prepare Follow-up
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
