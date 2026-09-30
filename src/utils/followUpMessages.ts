import type { Lead, OutreachChannel } from '../types'

export type FollowUpNumber = 1 | 2
export interface FollowUpMessageContext { lead: Lead; sequenceNumber: FollowUpNumber; channel: OutreachChannel; service?: string | null; previousMessage?: string | null }

function cleanCompany(value: string | null | undefined) { return String(value || 'your business').replace(/\s*[—-]\s*Website\s*$/i, '').replace(/[.!?]+\s*$/, '').trim() || 'your business' }
function cleanName(value: string | null | undefined) { const name=String(value||'').trim(); return name && !/^(there|hi|hello|admin|info)$/i.test(name) ? name : 'there' }
function inferService(lead: Lead, explicit?: string | null) { if(explicit?.trim()) return explicit.trim(); const text=[lead.notes,lead.initial_outreach?.message_text].filter(Boolean).join(' '); const match=text.match(/\b(Business Website|E-commerce|Custom Web App|Redesign|React\/MERN|Bug Fixes)\b/i); return match?.[1] || 'website' }
function priorValueLine(lead: Lead, previous?: string | null) { const text=String(previous ?? lead.initial_outreach?.message_text ?? '').replace(/\s+/g,' ').trim(); if(!text) return `the idea I shared for ${cleanCompany(lead.company)}`; const first=text.split(/(?<=[.!?])\s+/)[0]; return first.length<=180 ? first : `the idea I shared for ${cleanCompany(lead.company)}` }

export function generateFollowUpMessage(ctx: FollowUpMessageContext): string {
 const {lead,sequenceNumber,channel}=ctx; const company=cleanCompany(lead.company); const name=cleanName(lead.contact_name); const niche=String(lead.niche||'').trim(); const service=inferService(lead,ctx.service); const businessContext=niche ? ` for your ${niche} business` : ''; const value=priorValueLine(lead,ctx.previousMessage);
 if(sequenceNumber===1){
  if(channel==='Email') return `Hi ${name},\n\nJust following up on the idea I shared for ${company}${businessContext}. I wanted to check whether a ${service} could be useful for helping people discover your business and make enquiries.\n\nIf you'd like, I can send over a quick outline of how I'd approach it.\n\nBest,\nJohn\nKing JohnKay Fundz`;
  return `Hi ${name} 👋 Just checking in on ${value}. I thought it could be a simple way to strengthen ${company}'s online presence${businessContext}.\n\nIf you'd like, I can send you a quick outline. — JohnKay Fundz`
 }
 if(channel==='Email') return `Hi ${name},\n\nJust one last follow-up on the idea I shared for ${company}. No pressure at all — if a ${service} isn't a priority right now, that's completely fine.\n\nIf you'd like to revisit it later, I'd be happy to put together a quick outline when the timing is right.\n\nBest,\nJohn\nKing JohnKay Fundz`;
 return `Hi ${name} 👋 Just one last follow-up on the idea I shared for ${company}. No pressure at all — if now isn't the right time, that's completely fine.\n\nIf you'd like to revisit it later, I'd be happy to help. — JohnKay Fundz`
}

export function generateScheduledFollowUpMessage(lead: Lead, sequenceNumber: FollowUpNumber, channel: OutreachChannel, service?: string | null) { return generateFollowUpMessage({lead,sequenceNumber,channel,service}) }
export function getFollowUpChannel(lead: Lead, preferred?: OutreachChannel): OutreachChannel { if(preferred) return preferred; if(lead.initial_outreach?.channel && ['Email','Instagram','WhatsApp'].includes(lead.initial_outreach.channel)) return lead.initial_outreach.channel as OutreachChannel; if(lead.email) return 'Email'; if(lead.instagram) return 'Instagram'; return 'WhatsApp' }