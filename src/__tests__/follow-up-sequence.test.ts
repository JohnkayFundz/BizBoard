import { describe, expect, it } from 'vitest'
import { getFollowUpQueueSummary, getFollowUpSchedule, isFollowUpEligible } from '../utils/followUpSequence'

const baseLead = {
  id: 'lead-1',
  status: 'Contacted',
  sequence_status: 'active' as const,
  initial_outreach: {
    channel: 'Email',
    sent_at: '2026-09-25T10:00:00.000Z',
    message_text: 'Hello',
    status: 'initiated' as const,
  },
  follow_ups: [],
}

describe('follow-up sequence scheduling', () => {
  it('schedules follow-up #1 on day 3 and #2 on day 7', () => {
    const result = getFollowUpSchedule(baseLead, new Date('2026-09-26T10:00:00.000Z'))
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ sequence_number: 1, scheduled_for: '2026-09-28T10:00:00.000Z', status: 'upcoming' })
    expect(result[1]).toMatchObject({ sequence_number: 2, scheduled_for: '2026-10-02T10:00:00.000Z', status: 'upcoming' })
  })

  it('marks day 3 as due and day 7 as upcoming', () => {
    const result = getFollowUpSchedule(baseLead, new Date('2026-09-28T12:00:00.000Z'))
    expect(result[0].status).toBe('due')
    expect(result[1].status).toBe('upcoming')
  })

  it('marks a missed scheduled follow-up as overdue', () => {
    const result = getFollowUpSchedule(baseLead, new Date('2026-10-01T12:00:00.000Z'))
    expect(result[0].status).toBe('overdue')
    expect(result[1].status).toBe('upcoming')
  })

  it('does not generate a second schedule after follow-up #1 is sent', () => {
    const result = getFollowUpSchedule({
      ...baseLead,
      follow_ups: [{ sequence_number: 1, scheduled_for: '2026-09-28T10:00:00.000Z', sent_at: '2026-09-28T10:30:00.000Z', status: 'sent', channel: 'Email', message_text: 'Follow-up' }],
    }, new Date('2026-09-29T10:00:00.000Z'))
    expect(result).toHaveLength(1)
    expect(result[0].sequence_number).toBe(2)
    expect(result[0].scheduled_for).toBe('2026-10-02T10:00:00.000Z')
  })

  it('stops eligibility for replied, interested, proposal sent, and won leads', () => {
    for (const status of ['Replied', 'Interested', 'Proposal Sent', 'Won']) {
      expect(isFollowUpEligible('active', status)).toBe(false)
      expect(getFollowUpSchedule({ ...baseLead, status })).toEqual([])
    }
  })

  it('requires an active sequence and initial outreach timestamp', () => {
    expect(getFollowUpSchedule({ ...baseLead, sequence_status: 'paused' })).toEqual([])
    expect(getFollowUpSchedule({ ...baseLead, initial_outreach: null })).toEqual([])
  })

  it('aggregates due, overdue, today, and upcoming queues', () => {
    const leads = [
      baseLead,
      { ...baseLead, id: 'lead-2', initial_outreach: { ...baseLead.initial_outreach, sent_at: '2026-09-20T10:00:00.000Z' } },
      { ...baseLead, id: 'lead-3', initial_outreach: { ...baseLead.initial_outreach, sent_at: '2026-09-27T10:00:00.000Z' } },
    ]
    const summary = getFollowUpQueueSummary(leads, new Date('2026-09-29T12:00:00.000Z'))
    expect(summary.overdue.length).toBeGreaterThan(0)
    expect(summary.today.length).toBe(1)
    expect(summary.due.length).toBe(summary.overdue.length + summary.today.length)
    expect(summary.upcoming.length).toBeGreaterThan(0)
  })
})
