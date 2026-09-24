export const LEAD_STAGES = ['New Lead','Contacted','Replied','Interested','Proposal Sent','Won','Lost'] as const
export type LeadStage = typeof LEAD_STAGES[number]
export const OUTREACH_CHANNELS = ['Email','Instagram','WhatsApp'] as const
export type OutreachChannel = typeof OUTREACH_CHANNELS[number]
export const FOLLOW_UP_METHODS = ['Call','Email','Instagram','WhatsApp','Meeting'] as const
export type FollowUpMethod = typeof FOLLOW_UP_METHODS[number]
export const FOLLOW_UP_OUTCOMES = ['Interested','Needs follow-up','No response','Not interested'] as const
export type FollowUpOutcome = typeof FOLLOW_UP_OUTCOMES[number]
export interface Lead { id:string; user_id?:string; company:string; contact_name:string|null; role:string|null; email:string|null; phone:string|null; website:string|null; instagram:string|null; niche:string|null; location:string|null; source:string|null; status:LeadStage; deal_value:number|string|null; next_follow_up:string|null; notes:string|null; created_at?:string; updated_at?:string }
export interface LeadActivity { id:number|string; lead_id:string; activity_type:string; note:string; created_at:string }
export interface IntelligenceChecks { mobile:boolean; cta:boolean; contact:boolean; ecommerce:boolean; seo:boolean }
export interface IntelligenceResult { success:boolean; url:string; response_ms?:number; status?:number; title?:string; description?:string; checks:IntelligenceChecks; score:number; findings:string[]; opportunities:string[]; recommended_service:string; estimated_value:number }
export interface Proposal { leadId:string; service:string; investment:number; taxRate:number; tax:number; total:number; timeline:string; milestones:Array<{label:string;percent:number;amount:number}>; markdown:string }
export interface OutreachTemplateContext { contact_name:string; company_name:string; opportunity_score:string; recommended_service:string; location:string; website:string }
