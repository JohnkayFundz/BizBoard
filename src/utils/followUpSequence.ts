import type { LeadStage, FollowUpRecord, SequenceStatus } from '../types'

export const FOLLOW_UP_SCHEDULE_DAYS = [3, 7] as const
export type FollowUpSequenceNumber = 1 | 2
export type FollowUpScheduleStatus = 'scheduled' | 'due' | 'overdue' | 'upcoming'

export interface FollowUpScheduleItem {
  sequence_number: FollowUpSequenceNumber
  scheduled_for: string
  status: FollowUpScheduleStatus
  existing: FollowUpRecord | null
}

export interface FollowUpQueueSummary {
  due: FollowUpScheduleItem[]
  overdue: FollowUpScheduleItem[]
  today: FollowUpScheduleItem[]
  upcoming: FollowUpScheduleItem[]
}

const STOPPED_STAGES: LeadStage[] = ['Replied', 'Interested', 'Proposal Sent', 'Won']

export function isFollowUpEligible(sequenceStatus?: SequenceStatus | string | null, stage?: LeadStage | string | null) {
  return sequenceStatus === 'active' && !STOPPED_STAGES.includes(stage as LeadStage)
}

function parseDate(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function addDays(value: string, days: number) {
  const date = new Date(value)
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

function localDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

function classifySchedule(scheduledFor: string, now: Date): FollowUpScheduleStatus {
  const scheduled = new Date(scheduledFor)
  const todayKey = localDateKey(now)
  const scheduledKey = localDateKey(scheduled)

  if (scheduledKey < todayKey) return 'overdue'
  if (scheduledKey === todayKey) return 'due'
  return 'upcoming'
}

export function getFollowUpSchedule(lead: {
  initial_outreach?: { sent_at?: string | null; status?: string | null } | null
  follow_ups?: FollowUpRecord[] | null
  sequence_status?: SequenceStatus | string | null
  status?: LeadStage | string | null
}, now = new Date()): FollowUpScheduleItem[] {
  if (!isFollowUpEligible(lead.sequence_status, lead.status)) return []

  const sentAt = parseDate(lead.initial_outreach?.sent_at)
  if (!sentAt || !lead.initial_outreach?.status || lead.initial_outreach.status === 'not_sent') return []

  const existing = Array.isArray(lead.follow_ups) ? lead.follow_ups : []
  const schedule: FollowUpScheduleItem[] = []

  for (const sequenceNumber of [1, 2] as const) {
    const record = existing.find(item => Number(item.sequence_number) === sequenceNumber) || null
    if (record?.sent_at || ['sent', 'completed', 'skipped', 'cancelled'].includes(String(record.status).toLowerCase())) continue

    const scheduledFor = sequenceNumber === 1
      ? addDays(sentAt.toISOString(), FOLLOW_UP_SCHEDULE_DAYS[0])
      : addDays(sentAt.toISOString(), FOLLOW_UP_SCHEDULE_DAYS[1])

    schedule.push({
      sequence_number: sequenceNumber,
      scheduled_for: record?.scheduled_for || scheduledFor,
      status: classifySchedule(record?.scheduled_for || scheduledFor, now),
      existing: record,
    })
  }

  return schedule
}

export function getFollowUpQueueSummary(leads: Array<{
  initial_outreach?: { sent_at?: string | null; status?: string | null } | null
  follow_ups?: FollowUpRecord[] | null
  sequence_status?: SequenceStatus | string | null
  status?: LeadStage | string | null
  id?: string | number
}>, now = new Date()): FollowUpQueueSummary {
  const items = leads.flatMap(lead => getFollowUpSchedule(lead, now))
  const overdue = items.filter(item => item.status === 'overdue')
  const today = items.filter(item => item.status === 'due')
  const upcoming = items
    .filter(item => item.status === 'upcoming')
    .sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for))
  return { due: [...overdue, ...today], overdue, today, upcoming }
}

export function getNextFollowUpDate(lead: Parameters<typeof getFollowUpSchedule>[0], now = new Date()) {
  return getFollowUpSchedule(lead, now)[0]?.scheduled_for || null
}
