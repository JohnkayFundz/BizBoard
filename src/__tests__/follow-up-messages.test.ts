import { describe, expect, it } from 'vitest'
import { generateFollowUpMessage, getFollowUpChannel } from '../utils/followUpMessages'

const lead = {
  id:'lead-1', company:'Femtrade International Agencies', contact_name:null, role:null, email:null, phone:'+2348033736980',
  website:null, instagram:null, niche:'real estate', location:'Lagos', source:'EstateAgentsNG', status:'Contacted',
  deal_value:150000, next_follow_up:null, notes:null,
  initial_outreach:{channel:'WhatsApp',sent_at:'2026-09-25T10:00:00.000Z',message_text:'I can send a quick idea for Femtrade International Agencies with a Business Website.',status:'initiated'},
  follow_ups:[], sequence_status:'active'
}

describe('follow-up message generation',()=>{
 it('generates a concise personalized day 3 message',()=>{const m=generateFollowUpMessage({lead:lead as any,sequenceNumber:1,channel:'WhatsApp'});expect(m).toContain('Femtrade International Agencies');expect(m).toContain('real estate');expect(m).toContain('I can send a quick idea')})
 it('generates a formal day 7 email wrap-up',()=>{const m=generateFollowUpMessage({lead:lead as any,sequenceNumber:2,channel:'Email',service:'Business Website'});expect(m).toContain('one last follow-up');expect(m).toContain('Business Website');expect(m).toContain('No pressure')})
 it('supports Instagram and defaults to initial outreach channel',()=>{expect(generateFollowUpMessage({lead:lead as any,sequenceNumber:1,channel:'Instagram'})).toContain('👋');expect(getFollowUpChannel(lead as any)).toBe('WhatsApp')})
 it('does not mutate lead state',()=>{const before=JSON.stringify(lead);generateFollowUpMessage({lead:lead as any,sequenceNumber:1,channel:'Email'});expect(JSON.stringify(lead)).toBe(before)})
})