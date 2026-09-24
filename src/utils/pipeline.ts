export interface PipelineLead {
  id?: string | number
  company?: string | null
  contact_name?: string | null
  email?: string | null
  phone?: string | null
  status?: string | null
  deal_value?: number | string | null
  next_follow_up?: string | null
}

export interface PipelineMetrics {
  total: number
  active: number
  pipeline: number
  won: number
  due: number
}

const CLOSED_STAGES = new Set(['Won', 'Lost'])

function amount(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

export function calculatePipelineMetrics(leads: PipelineLead[], today: string): PipelineMetrics {
  const active = leads.filter(lead => !CLOSED_STAGES.has(String(lead.status || 'New Lead')))
  return {
    total: leads.length,
    active: active.length,
    pipeline: active.reduce((sum, lead) => sum + amount(lead.deal_value), 0),
    won: leads.filter(lead => lead.status === 'Won').reduce((sum, lead) => sum + amount(lead.deal_value), 0),
    due: active.filter(lead => Boolean(lead.next_follow_up && lead.next_follow_up <= today)).length,
  }
}

function normalize(value: unknown): string {
  return String(value ?? '').trim().toLowerCase().replace(/\D/g, '')
}

function normalizedEmail(value: unknown): string {
  return String(value ?? '').trim().toLowerCase()
}

function normalizedCompany(value: unknown): string {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export interface DuplicateGroup {
  ids: Array<string | number>
  reason: 'email' | 'phone' | 'company'
}

export function findPotentialDuplicateLeads(leads: PipelineLead[]): DuplicateGroup[] {
  const groups = new Map<string, DuplicateGroup>()
  const seen = new Map<string, string | number>()

  for (const lead of leads) {
    const identityKeys = [
      normalizedEmail(lead.email) ? `email:${normalizedEmail(lead.email)}` : '',
      normalize(lead.phone) ? `phone:${normalize(lead.phone)}` : '',
      normalizedCompany(lead.company) ? `company:${normalizedCompany(lead.company)}` : '',
    ].filter(Boolean)

    for (const key of identityKeys) {
      const existingId = seen.get(key)
      if (existingId !== undefined && existingId !== lead.id) {
        const reason = key.split(':', 1)[0] as DuplicateGroup['reason']
        const groupKey = `${reason}:${existingId}:${lead.id}`
        if (!groups.has(groupKey)) groups.set(groupKey, { ids: [existingId, lead.id].sort((a, b) => String(a).localeCompare(String(b))), reason })
      } else {
        seen.set(key, lead.id ?? '')
      }
    }
  }

  return [...groups.values()]
}
