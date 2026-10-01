import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { BarChart3, Bell, BriefcaseBusiness, Check, ChevronDown, Copy, ExternalLink, Filter, LogOut, Plus, RefreshCw, Search, Target, Trash2, Users, X, ArrowUpDown, ChevronLeft, ChevronRight, FileDown } from 'lucide-react'
import { leadSchema, intelligenceSchema, proposalSchema, cleanText } from './lib/validation'
import { env, envError } from './lib/env'
import { assessIntelligence, normalizeWebsiteUrl } from './utils/intelligence'
import { calculatePipelineMetrics, findPotentialDuplicateLeads, findLeadDuplicate } from './utils/pipeline'
import { calculateLeadScore } from './utils/leadScoring'
import { buildMailtoUrl, buildWhatsAppUrl, buildInstagramInboxUrl, normalizeWhatsAppPhone } from './utils/outreach'
import { getFollowUpQueueSummary, getFollowUpSchedule, isFollowUpEligible } from './utils/followUpSequence'
import { generateFollowUpMessage, getFollowUpChannel } from './utils/followUpMessages'
import { downloadProposalPdf } from './utils/pdfGenerator'
import { Metric, Select, FollowupCard } from './components/Ui'
import { LeadIntelligence } from './components/LeadIntelligence'
import { DashboardSummary } from './components/DashboardSummary'
import { LeadModals } from './components/LeadModals'
import { LeadPipeline } from './components/LeadPipeline'
import { ProposalGenerator } from './components/ProposalGenerator'
import { OutreachEngine } from './components/OutreachEngine'
import { ActionCenter } from './components/ActionCenter'
import { OutreachCampaignModal } from './components/OutreachCampaignModal'


const supabase = env ? createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY) : null

const stages=['New Lead','Contacted','Replied','Interested','Proposal Sent','Won','Lost']
const tone={ 'New Lead':'blue',Contacted:'indigo',Replied:'violet',Interested:'amber','Proposal Sent':'orange','Bounced / Correction Required':'red',Won:'green',Lost:'red' }
const empty={company:'',contact_name:'',role:'',email:'',phone:'',website:'',instagram:'',niche:'',location:'',source:'Manual',status:'New Lead',deal_value:'',opportunity_type:'',next_follow_up:'',notes:''}
const money=v=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(Number(v||0))
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
const titleCaseName=value=>{const raw=String(value||'').trim().replace(/[_-]+/g,' ').replace(/\s+/g,' ');if(!raw)return '';return raw.split(' ').map(token=>{if(token.length<=4&&token===token.toUpperCase()&&/[A-Z]/.test(token))return token;return token.toLowerCase().replace(/(^|[’'])([a-z])/g,(_,p,l)=>p+l.toUpperCase()).replace(/^[a-z]/,l=>l.toUpperCase())}).join(' ')}
const dateAfterDays=days=>{const d=new Date();d.setDate(d.getDate()+days);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}

export default function App(){
 const [session,setSession]=useState(null),[loading,setLoading]=useState(true),[mode,setMode]=useState('login'),[now,setNow]=useState(()=>new Date())
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[authMsg,setAuthMsg]=useState('')
 const [leads,setLeads]=useState([]),[query,setQuery]=useState(''),[status,setStatus]=useState('All'),[source,setSource]=useState('All'),[followUpFilter,setFollowUpFilter]=useState('All'),[sortKey,setSortKey]=useState('updated_at'),[sortDir,setSortDir]=useState('desc'),[page,setPage]=useState(1),[pageSize]=useState(10)
 const [modal,setModal]=useState(false),[form,setForm]=useState(empty),[saving,setSaving]=useState(false),[syncing,setSyncing]=useState(false),[toast,setToast]=useState('')
 const [followUpReviewLead,setFollowUpReviewLead]=useState(null),[followUpReviewSequence,setFollowUpReviewSequence]=useState(1),[followUpReviewChannel,setFollowUpReviewChannel]=useState('WhatsApp'),[followUpReviewMessage,setFollowUpReviewMessage]=useState(''),[followUpReviewBusy,setFollowUpReviewBusy]=useState(false)
 const [activityLead,setActivityLead]=useState(null),[activities,setActivities]=useState([]),[activityType,setActivityType]=useState('Note'),[activityNote,setActivityNote]=useState(''),[activityFollowUp,setActivityFollowUp]=useState(''),[activityLoading,setActivityLoading]=useState(false),[activitySaving,setActivitySaving]=useState(false),[completingFollowUp,setCompletingFollowUp]=useState(false),[followUpMethod,setFollowUpMethod]=useState('Call'),[followUpOutcome,setFollowUpOutcome]=useState('Needs follow-up'),[followUpNote,setFollowUpNote]=useState(''),[followUpNextDate,setFollowUpNextDate]=useState(''),[followUpMessage,setFollowUpMessage]=useState(''),[followUpCopied,setFollowUpCopied]=useState(false),[followUpMessageLoading,setFollowUpMessageLoading]=useState(false)
 const [selectedIds,setSelectedIds]=useState([]),[campaignOpen,setCampaignOpen]=useState(false),[campaignLeads,setCampaignLeads]=useState([]),[campaignIndex,setCampaignIndex]=useState(0),[campaignChannel,setCampaignChannel]=useState('Email'),[campaignMessage,setCampaignMessage]=useState(''),[campaignCopied,setCampaignCopied]=useState(false),[outreachLead,setOutreachLead]=useState(null),[outreachChannel,setOutreachChannel]=useState('Email'),[outreachMessage,setOutreachMessage]=useState(''),[outreachCopied,setOutreachCopied]=useState(false),[outreachSending,setOutreachSending]=useState(false)
 const [intelLead,setIntelLead]=useState(null),[intelUrl,setIntelUrl]=useState(''),[intelChecks,setIntelChecks]=useState({mobile:false,cta:false,contact:false,ecommerce:false,seo:false}),[intelReport,setIntelReport]=useState(''),[intelCopied,setIntelCopied]=useState(false),[intelAnalyzing,setIntelAnalyzing]=useState(false),[intelGenerating,setIntelGenerating]=useState(false),[intelResult,setIntelResult]=useState(null)
 const [proposalLead,setProposalLead]=useState(null),[proposalService,setProposalService]=useState('Business Website'),[proposalPrice,setProposalPrice]=useState('150000'),[proposalTimeline,setProposalTimeline]=useState('7–10 business days'),[proposalTaxRate,setProposalTaxRate]=useState('0'),[proposalText,setProposalText]=useState(''),[proposalCopied,setProposalCopied]=useState(false),[proposalAnalyses,setProposalAnalyses]=useState({}),[proposalTracking,setProposalTracking]=useState(false),[proposalGenerating,setProposalGenerating]=useState(false),[proposalPdfBusy,setProposalPdfBusy]=useState(false),[intelligenceHistory,setIntelligenceHistory]=useState([]),[proposalOpportunity,setProposalOpportunity]=useState(null)

 useEffect(()=>{if(!supabase){setLoading(false);return} supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false)});const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));return()=>subscription.unsubscribe()},[])
 useEffect(()=>{const timer=window.setInterval(()=>setNow(new Date()),60000);return()=>window.clearInterval(timer)},[])
 useEffect(()=>{if(!session)return;load();const channel=supabase.channel('crm-live').on('postgres_changes',{event:'*',schema:'public',table:'crm_leads'},()=>load()).subscribe();return()=>{supabase.removeChannel(channel)}},[session])
 useEffect(()=>{const sync=(current)=>current?.id?leads.find(l=>String(l.id)===String(current.id))||current:null;setIntelLead(sync(intelLead));setProposalLead(sync(proposalLead));setOutreachLead(sync(outreachLead));setActivityLead(sync(activityLead))},[leads])
 useEffect(()=>{if(!session||!intelLead?.id)return;loadIntelligenceHistory(intelLead.id)},[session,intelLead?.id])
 async function load(){const {data,error}=await supabase.from('crm_leads').select('*').order('updated_at',{ascending:false});if(error){notify(error.message);return []}const hydrated=(data||[]).map(l=>({...l,...calculateLeadScore(l)}));setLeads(hydrated);return hydrated}
 async function loadIntelligenceHistory(leadId){
  const {data,error}=await supabase.from('crm_intelligence_reports').select('*').eq('lead_id',leadId).order('created_at',{ascending:false}).limit(20)
  if(error){notify(error.message);return}
  setIntelligenceHistory((data||[]).map(r=>({id:r.id,leadId:r.lead_id,websiteUrl:r.website_url,score:r.score,checklist:r.checklist,keyFindings:r.key_findings,keyOpportunities:r.key_opportunities,recommendedService:r.recommended_service,estimatedValue:Number(r.estimated_value||0),reportType:r.report_type,createdAt:r.created_at})))
 }
 async function saveIntelligenceReport(result=null, checks=intelChecks){
  if(!intelLead)return null
  const hasWebsite=Boolean(intelLead.website||intelUrl.trim())
  const assessment=assessIntelligence(checks,hasWebsite)
  const opportunityScore=hasWebsite?assessment.score:5
  const company=String(intelLead.company||'this business').replace(/\s*[—-]\s*Website\s*$/i,'')
  const fallbackFindings=hasWebsite?['Existing website available for review.']:['No verified website is currently saved for this prospect.','Treat this as a new website opportunity rather than an existing-site audit.']
  const auditGaps=Object.entries(checks).filter(([,value])=>!value).map(([key])=>'Improve '+(key==='mobile'?'mobile experience':key==='cta'?'calls to action':key==='contact'?'contact and enquiry options':key==='ecommerce'?'e-commerce capability':'basic SEO readiness'))
  const fallbackOpportunities=hasWebsite?(auditGaps.length?auditGaps:['Strengthen the existing website experience and customer enquiry path.']):['Establish a professional online presence and clear customer enquiry path.','Present products or services clearly on mobile devices.','Make it easier for customers to contact or enquire.']
  const findings=(result?.findings?.filter(Boolean)||fallbackFindings).map(x=>String(x).replace(/^•\s*/,''))
  const opportunities=(result?.opportunities?.filter(Boolean)||fallbackOpportunities).map(x=>String(x).replace(/^•\s*/,''))
  const salesAngle=String(result?.sales_angle||result?.salesAngle||(hasWebsite?'Improving '+company+'\'s existing online experience could make it easier for customers to understand the business, take action and enquire.':'A professional website could establish a modern, high-converting digital presence for '+company+', making it easier for customers to discover the business, understand its offerings and make enquiries.'))
  const report={lead_id:intelLead.id,website_url:intelUrl.trim()||intelLead.website||null,score:Number(result?.score??opportunityScore),checklist:checks,key_findings:findings,key_opportunities:opportunities,sales_angle:salesAngle,recommended_service:(result?.recommended_service||assessment.recommendedService),estimated_value:Number(result?.estimated_value??assessment.estimatedValue),report_type:(intelLead.website||intelUrl.trim()?'audit':'new_website')}
  if(!supabase){notify('Report generated, but Supabase is not configured.');return null}
  const {data,error}=await supabase.from('crm_intelligence_reports').insert(report).select().single()
  if(error){notify('Report generated, but history save failed: '+error.message);return null}
  const mapped={id:data.id,leadId:data.lead_id,websiteUrl:data.website_url,score:data.score,checklist:data.checklist,keyFindings:data.key_findings,keyOpportunities:data.key_opportunities,recommendedService:data.recommended_service,estimatedValue:Number(data.estimated_value||0),reportType:data.report_type,createdAt:data.created_at}
  setIntelligenceHistory(x=>[mapped,...x.filter(r=>r.id!==mapped.id)])
  setProposalAnalyses(x=>({...x,[mapped.leadId]:{score:mapped.score,checks:mapped.checklist,findings:mapped.keyFindings,opportunities:mapped.keyOpportunities,recommended_service:mapped.recommendedService,estimated_value:mapped.estimatedValue}}))
  // Keep canonical CRM opportunity fields aligned without overwriting an existing deal value.
  const inferredOpportunity=intelLead.opportunity_type||(mapped.reportType==='new_website'?'New Website':mapped.recommendedService)
  const valueUpdate=Number(intelLead.deal_value||0)<=0&&mapped.estimatedValue>0?{deal_value:mapped.estimatedValue}:{}
  const opportunityUpdate=!intelLead.opportunity_type?{opportunity_type:inferredOpportunity}:{}
  if(Object.keys(valueUpdate).length||Object.keys(opportunityUpdate).length){
   const nextLead={...intelLead,...valueUpdate,...opportunityUpdate}; const nextScore=calculateLeadScore(nextLead); const leadUpdate=await supabase.from('crm_leads').update({...valueUpdate,...opportunityUpdate,score:nextScore.score,score_tier:nextScore.scoreTier,updated_at:new Date().toISOString()}).eq('id',mapped.leadId).select().single()
   if(!leadUpdate.error){setLeads(x=>x.map(l=>l.id===leadUpdate.data.id?leadUpdate.data:l));if(intelLead?.id===leadUpdate.data.id)setIntelLead(leadUpdate.data);if(proposalLead?.id===leadUpdate.data.id)setProposalLead(leadUpdate.data)} else notify('Opportunity saved, but canonical field sync failed: '+leadUpdate.error.message)
  }
  return mapped
 }
 function applyIntelligenceReport(report){
  if(!report)return
  setIntelChecks(report.checklist);setIntelUrl(report.websiteUrl||'');setIntelReport('')
  setIntelResult({score:report.score,checks:report.checklist,findings:report.keyFindings,opportunities:report.keyOpportunities,recommended_service:report.recommendedService,estimated_value:report.estimatedValue})
  setProposalAnalyses(x=>({...x,[report.leadId]:{score:report.score,checks:report.checklist,findings:report.keyFindings,opportunities:report.keyOpportunities,recommended_service:report.recommendedService,estimated_value:report.estimatedValue}}))
  buildIntelligenceReport({score:report.score,findings:report.keyFindings,opportunities:report.keyOpportunities,recommended_service:report.recommendedService,estimated_value:report.estimatedValue},report.checklist)
  notify('Intelligence report restored')
 }
 async function generateProposalFromOpportunity(report){
  if(!report||!intelLead)return
  const saved=report.id?report:await saveIntelligenceReport(null,report.checklist)
  if(!saved)return
  setProposalLead(intelLead);setProposalOpportunity(saved);setProposalService(saved.recommendedService);setProposalPrice(String(saved.estimatedValue));setProposalTaxRate('0');setProposalTimeline(saved.recommendedService==='E-commerce Website'?'10–14 business days':saved.recommendedService==='Custom Web Application'?'14–21 business days':'7–10 business days')
  setProposalText('');setProposalCopied(false)
  document.getElementById('proposal')?.scrollIntoView({behavior:'smooth',block:'start'})
  notify('Proposal pre-filled from opportunity report')
 }

 async function openActivity(l){setActivityLead(l);setActivityNote('');setActivityType('Note');setFollowUpMethod('Call');setFollowUpOutcome('Needs follow-up');setFollowUpNextDate(dateAfterDays(3));setFollowUpNote('');setFollowUpCopied(false);setFollowUpMessage('');setFollowUpMessageLoading(true);setActivityLoading(true);const [{data,error},analysis]=await Promise.all([supabase.from('crm_lead_activity').select('*').eq('lead_id',l.id).order('created_at',{ascending:false}),resolveOutreachAnalysis(l)]);if(error)notify(error.message);else setActivities(data||[]);setFollowUpMessage(followUpTemplate(l,analysis,'WhatsApp'));setFollowUpMessageLoading(false);setActivityLoading(false)}
 async function addActivity(e){e.preventDefault();if(!activityLead||!activityNote.trim())return;setActivitySaving(true);const r=await supabase.from('crm_lead_activity').insert({lead_id:activityLead.id,activity_type:activityType,note:activityNote.trim()}).select().single();if(r.error)notify(r.error.message);else{let followUpUpdated=false;if(activityFollowUp){const u=await supabase.from('crm_leads').update({next_follow_up:activityFollowUp,updated_at:new Date().toISOString()}).eq('id',activityLead.id).select().single();if(u.error)notify(u.error.message);else{setLeads(x=>x.map(a=>a.id===activityLead.id?u.data:a));setActivityLead(u.data);followUpUpdated=true}}setActivities(x=>[r.data,...x]);setActivityNote('');setActivityFollowUp('');notify(followUpUpdated?'Activity added · next follow-up scheduled':'Activity added')}setActivitySaving(false)}
 function followUpTemplate(l,analysisOverride=null,channel=followUpMethod){
  const analysis=analysisOverride||proposalAnalyses[l?.id]||(intelResult&&intelLead?.id===l?.id?intelResult:null)
  const template=channel==='Email'
    ? 'Hi {contactName},\n\nJust following up on my message about {companyName}. I thought a {recommendedService} could give customers a clearer place to discover the business and enquire.\n\nIf you\'re open to it, I can send over a quick idea for {companyName}.\n\nBest,\nJohn\nKing JohnKay Fundz'
    : channel==='Instagram'
      ? 'Hi {contactName} 👋 just following up on my message about {companyName}. I thought a {recommendedService} could make it easier for customers to discover the business and enquire.\n\nIf you\'re open to it, I can send you a quick idea for {companyName}. — JohnKay Fundz'
      : 'Hi {contactName}, just following up on my message about {companyName}. I thought a {recommendedService} could make it easier for customers to discover the business and enquire.\n\nIf you\'re open to it, I can send you a quick idea for {companyName}.'
  return interpolateTemplate(template,l,analysis)
}
async function refreshFollowUpMessage(channel=followUpMethod){
  if(!activityLead)return
  setFollowUpMessageLoading(true);setFollowUpCopied(false)
  const analysis=await resolveOutreachAnalysis(activityLead)
  setFollowUpMessage(followUpTemplate(activityLead,analysis,channel));setFollowUpMessageLoading(false)
}
async function copyFollowUp(){
  if(!followUpMessage.trim())return
  try{await navigator.clipboard.writeText(followUpMessage.trim());setFollowUpCopied(true);notify('Follow-up message copied');setTimeout(()=>setFollowUpCopied(false),1800)}catch{notify('Copy failed — select the message and copy it manually')}
}
async function completeFollowUp(){
  if(!activityLead||completingFollowUp)return
  if(!followUpNote.trim()){notify('Add the outcome and notes');return}
  if(followUpOutcome!=='Not interested'&&!followUpNextDate){notify('Add the next follow-up date');return}
  setCompletingFollowUp(true)
  try{
   const note=`Follow-up completed via ${followUpMethod}. Outcome: ${followUpOutcome}. ${followUpNote.trim()} Next follow-up: ${followUpNextDate}.`
   const r=await supabase.from('crm_lead_activity').insert({lead_id:activityLead.id,activity_type:followUpMethod,note}).select().single()
   if(r.error){notify(r.error.message);return}
   const nextStage=followUpOutcome==='Interested'?'Interested':followUpOutcome==='Not interested'?'Lost':activityLead.status
   const closedStage=['Won','Lost'].includes(nextStage)
   const nextScore=calculateLeadScore({...activityLead,status:nextStage}); const u=await supabase.from('crm_leads').update({next_follow_up:closedStage?null:followUpNextDate,status:nextStage,score:nextScore.score,score_tier:nextScore.scoreTier,updated_at:new Date().toISOString()}).eq('id',activityLead.id).select().single()
   if(u.error){notify(u.error.message);return}
   setLeads(x=>x.map(l=>l.id===activityLead.id?u.data:l));setActivityLead(u.data);setActivities(x=>[r.data,...x]);if(nextStage!==activityLead.status){const sh=await supabase.from('crm_lead_activity').insert({lead_id:activityLead.id,activity_type:'Stage change',note:'Stage changed from '+activityLead.status+' to '+nextStage+' after follow-up outcome: '+followUpOutcome+'.'}).select().single();if(!sh.error)setActivities(x=>[sh.data,...x])}setFollowUpNote('');setFollowUpNextDate('')
   notify(`Follow-up saved · next follow-up ${followUpNextDate}${nextStage!==activityLead.status?' · stage moved to '+nextStage:''}`)
  }catch(error){notify(error instanceof Error?error.message:'Follow-up completion failed')}
  finally{setCompletingFollowUp(false)}
 }
 function openFollowUpReview(lead){
 const schedule=getFollowUpSchedule(lead,now); const next=schedule[0]
 if(!next||!isFollowUpEligible(lead.sequence_status,lead.status)){notify('No eligible follow-up is available for this lead');return}
 const channel=getFollowUpChannel(lead); setFollowUpReviewLead(lead); setFollowUpReviewSequence(next.sequence_number); setFollowUpReviewChannel(channel); setFollowUpReviewMessage(generateFollowUpMessage({lead,sequenceNumber:next.sequence_number,channel}));
}
function regenerateFollowUpReview(){if(!followUpReviewLead)return;setFollowUpReviewMessage(generateFollowUpMessage({lead:followUpReviewLead,sequenceNumber:followUpReviewSequence,channel:followUpReviewChannel}))}
async function markFollowUpSent(){
 if(!followUpReviewLead||followUpReviewBusy||!followUpReviewMessage.trim())return
 if(!isFollowUpEligible(followUpReviewLead.sequence_status,followUpReviewLead.status)){notify('This follow-up is no longer eligible');setFollowUpReviewLead(null);return}
 setFollowUpReviewBusy(true)
 try{
  const nowIso=new Date().toISOString(); const existing=Array.isArray(followUpReviewLead.follow_ups)?followUpReviewLead.follow_ups:[]
  const updatedFollowUps=[...existing.filter(x=>Number(x.sequence_number)!==followUpReviewSequence),{sequence_number:followUpReviewSequence,scheduled_for:getFollowUpSchedule(followUpReviewLead,now)[0]?.scheduled_for||null,sent_at:nowIso,status:'sent',channel:followUpReviewChannel,message_text:followUpReviewMessage.trim()}]
  const nextLead={...followUpReviewLead,follow_ups:updatedFollowUps}
  const nextSchedule=getFollowUpSchedule(nextLead,new Date(nowIso)).filter(x=>x.sequence_number!==followUpReviewSequence)
  const sequenceStatus=followUpReviewSequence===2?'completed':'active'
  const nextFollowUp=sequenceStatus==='completed'?null:(nextSchedule[0]?.scheduled_for||null)
  const u=await supabase.from('crm_leads').update({follow_ups:updatedFollowUps,next_follow_up:nextFollowUp,sequence_status:sequenceStatus,updated_at:nowIso}).eq('id',followUpReviewLead.id).select().single()
  if(u.error){notify(u.error.message);return}
  const a=await supabase.from('crm_lead_activity').insert({lead_id:followUpReviewLead.id,activity_type:'Follow-up Sent',note:`Follow-up #${followUpReviewSequence} marked as sent via ${followUpReviewChannel}. Next follow-up: ${nextFollowUp||'none'}.`}).select().single()
  if(a.error){notify('Follow-up recorded, but history logging failed')} else if(activityLead?.id===followUpReviewLead.id)setActivities(x=>[a.data,...x])
  setLeads(x=>x.map(l=>l.id===u.data.id?u.data:l)); if(activityLead?.id===u.data.id)setActivityLead(u.data); setFollowUpReviewLead(null); notify(`Follow-up #${followUpReviewSequence} recorded as sent`)
 }catch(error){notify(error instanceof Error?error.message:'Follow-up recording failed')}finally{setFollowUpReviewBusy(false)}
}
async function deleteActivity(a){if(!a?.id)return;if(!confirm('Delete this activity entry?'))return;const r=await supabase.from('crm_lead_activity').delete().eq('id',a.id);if(r.error){notify(r.error.message);return}setActivities(x=>x.filter(item=>item.id!==a.id));notify('Activity deleted')}
 async function contactAction(l,type){const targets={Email:l.email,Call:l.phone,Instagram:l.instagram,WhatsApp:l.phone,Website:l.website};const target=targets[type];if(!target){notify(`No ${type==='Call'?'phone':type.toLowerCase()} available for this lead`);return}const activityTypeValue=type==='Website'?'Note':type;const note=type==='Website'?'Opened website':`${type} contact action started`;const r=await supabase.from('crm_lead_activity').insert({lead_id:l.id,activity_type:activityTypeValue,note}).select().single();if(r.error){notify(r.error.message);return}setActivities(x=>activityLead?.id===l.id?[r.data,...x]:x);notify(`${type} activity recorded`);let url=target.trim();if(type==='Email')url=`mailto:${target.trim()}`;if(type==='Call')url=`tel:${target.trim()}`;if(type==='WhatsApp'){let n=target.replace(/\D/g,'');if(n.startsWith('0'))n='234'+n.slice(1);url=`https://wa.me/${n}`}if(type==='Instagram'){const handle=target.trim().replace(/^@/,'');url=handle.startsWith('http')?handle:`https://instagram.com/${handle}`}if(type==='Website'&&!/^https?:\/\//i.test(url))url=`https://${url}`;window.open(url,'_blank','noopener,noreferrer')}
 function activityLabel(type){return type==='Stage change'?'Stage update':type}
 function interpolateTemplate(template,l,analysisOverride=null){
  const analysis=analysisOverride||proposalAnalyses[l?.id]||(intelResult&&intelLead?.id===l?.id?intelResult:null)
  const companyName=String(l?.company||'your business').replace(/\s*[—-]\s*Website\s*$/i,'').replace(/[.!?]+\s*$/,'').trim()
  const findings=(analysis?.findings||[]).filter(Boolean).map(x=>String(x).replace(/^•\s*/, '').trim())
  const opportunities=(analysis?.opportunities||[]).filter(Boolean).map(x=>String(x).replace(/^•\s*/, '').trim())
  const firstFinding=findings[0]||''
  const conciseFinding=firstFinding
    .replace(/^No verified website is currently saved for this prospect\.?$/i,'It looks like there’s an opportunity to give customers a clearer place to discover the business and enquire.')
    .replace(/^A professional website could establish a modern, high-converting digital presence for [^.]+, making it easier for customers to discover the business, understand its offerings and make enquiries\.?/i,'Customers would benefit from a clearer place to discover the business, understand its offerings and make enquiries.')
    .replace(/^A professional website could [^.]+\.?/i,'A clearer online presence could make it easier for customers to discover the business and enquire.')
  const opportunityAngle=analysis?.opportunity_angle||analysis?.sales_angle||analysis?.salesAngle||opportunities[0]||conciseFinding||'a stronger online presence and customer enquiry journey'
  const salesAngle=analysis?.sales_angle||analysis?.salesAngle||opportunityAngle
  const vars={contactName:String(l?.contact_name??'').trim().split(/\s+/)[0]||'there',companyName,opportunityScore:String(analysis?.score??'—'),recommendedService:analysis?.recommended_service||'Business Website',estimatedValue:analysis?.estimated_value?money(analysis.estimated_value):'',opportunityAngle,salesAngle,keyFindings:conciseFinding||'A clearer online presence could make it easier for customers to discover the business and enquire.',keyOpportunities:opportunities.join('; '),location:l?.location||'Lagos',website:l?.website||'',websiteContext:l?.website?'existing website':'online presence'}
  return template.replace(/{{\s*([a-z_]+)\s*}}|{\s*([A-Za-z]+(?:_[A-Za-z]+)*)\s*}/g,(_,legacy,key)=>{
    const map={contact_name:'contactName',company_name:'companyName',opportunity_score:'opportunityScore',recommended_service:'recommendedService',estimated_value:'estimatedValue',opportunity_angle:'opportunityAngle',sales_angle:'salesAngle',key_findings:'keyFindings',key_opportunities:'keyOpportunities',website_context:'websiteContext'}
    const resolved=key?(map[key]||key):map[legacy]
    return resolved in vars?String(vars[resolved]??''):''
  })
}

async function resolveOutreachAnalysis(l){
  const cached=proposalAnalyses[l?.id]||(intelResult&&intelLead?.id===l?.id?intelResult:null)
  if(!supabase||!l?.id)return cached||null
  const {data,error}=await supabase
   .from('crm_intelligence_reports')
   .select('score,checklist,key_findings,key_opportunities,sales_angle,recommended_service,estimated_value')
   .eq('lead_id',l.id)
   .order('created_at',{ascending:false})
   .limit(1)
   .maybeSingle()
  if(error||!data)return cached||null

  const toText=value=>Array.isArray(value)?value.filter(Boolean).map(item=>String(item).trim()).filter(Boolean):String(value??'').trim()
  const findings=toText(data.key_findings)
  const opportunities=toText(data.key_opportunities)
  const salesAngle=toText(data.sales_angle)
  const opportunityAngle=salesAngle||((Array.isArray(opportunities)?opportunities:[])[0]||'')
  const recommendedService=toText(data.recommended_service)||'Business Website'
  const estimatedValue=Number(data.estimated_value||0)

  const analysis={
   score:data.score,
   checks:data.checklist||{},
   findings:Array.isArray(findings)?findings:findings?[findings]:[],
   opportunities:Array.isArray(opportunities)?opportunities:opportunities?[opportunities]:[],
   sales_angle:salesAngle,
   recommended_service:recommendedService,
   estimated_value:Number.isFinite(estimatedValue)&&estimatedValue>0?estimatedValue:0,
   opportunity_angle:opportunityAngle
  }
  setProposalAnalyses(x=>({...x,[l.id]:analysis}))
  return analysis
}
function outreachTemplate(l,channel,analysisOverride=null){
  const analysis=analysisOverride||proposalAnalyses[l?.id]||(intelResult&&intelLead?.id===l?.id?intelResult:null)
  const personalize=(template)=>interpolateTemplate(template,l,analysis)
  if(channel==='Email')return personalize(`Hi {contactName},

I came across {companyName} and wanted to reach out. I’m John from King JohnKay Fundz, a web developer based in Lagos.

I noticed an opportunity to build a stronger online presence for {companyName} with a {recommendedService}. A clear website could make it easier for potential clients to discover the business, understand its services and make enquiries.

I’d be happy to share a quick idea of what I would build for {companyName}. Would you be open to taking a look?

Best,
John
King JohnKay Fundz`)
  if(channel==='Instagram')return personalize(`Hi {contactName} 👋 I came across {companyName} and noticed an opportunity to build a stronger online presence with a {recommendedService}.

A clear website could make it easier for potential clients to discover the business and make enquiries. If you’re interested, I can send you a quick idea for {companyName}. — JohnKay Fundz`)
  return personalize(`Hi {contactName}, I’m John from King JohnKay Fundz. I came across {companyName} and noticed an opportunity to build a stronger online presence with a {recommendedService}.

A clear website could make it easier for potential clients to discover the business and make enquiries. If useful, I can send you a quick idea for {companyName}.`)
}

async function openOutreach(l){
  const channel=l?.email?'Email':l?.instagram?'Instagram':'WhatsApp'
  setOutreachLead(l);setOutreachChannel(channel);setOutreachCopied(false)
  const analysis=await resolveOutreachAnalysis(l)
  setOutreachMessage(outreachTemplate(l,channel,analysis))
}
 async function openCampaign(){
  const selected=leads.filter(l=>selectedIds.some(id=>String(id)===String(l.id)) && !['Won','Lost'].includes(l.status||''))
  if(!selected.length){notify('Select at least one active lead');return}
  const channel=selected[0]?.email?'Email':selected[0]?.instagram?'Instagram':'WhatsApp'
  setCampaignLeads(selected);setCampaignIndex(0);setCampaignChannel(channel);setCampaignCopied(false);setCampaignOpen(true)
  const analysis=await resolveOutreachAnalysis(selected[0])
  setCampaignMessage(outreachTemplate(selected[0],channel,analysis))
 }
 async function campaignChannelChange(channel){
  setCampaignChannel(channel)
  const lead=campaignLeads[campaignIndex]
  if(lead){const analysis=await resolveOutreachAnalysis(lead);setCampaignMessage(outreachTemplate(lead,channel,analysis))}
  setCampaignCopied(false)
 }
 async function campaignIndexChange(index){
  setCampaignIndex(index)
  const lead=campaignLeads[index]
  if(lead){const analysis=await resolveOutreachAnalysis(lead);setCampaignMessage(outreachTemplate(lead,campaignChannel,analysis))}
  setCampaignCopied(false)
 }
 async function copyCampaignMessage(){
  if(!campaignMessage.trim())return
  try{await navigator.clipboard.writeText(campaignMessage.trim());setCampaignCopied(true);notify('Campaign message copied');setTimeout(()=>setCampaignCopied(false),1600)}catch{notify('Copy failed — select the message and copy it manually')}
 }
 async function dispatchCampaignLead(lead,channel,message){
  if(!lead||!message.trim())return
  const target=channel==='Email'?lead.email:channel==='Instagram'?lead.instagram:lead.phone
  if(!target){notify(`No ${channel.toLowerCase()} contact is saved for ${lead.company||'this lead'}`);return}
  const activity=await recordOutreachActivity(lead,channel,message)
  if(!activity)return
  if(channel==='Email')window.location.href=buildMailtoUrl(lead.email,`Quick idea for ${(lead.company||'your business').replace(/\s*[—-]\s*Website\s*$/i,'')}`,message.trim())
  if(channel==='WhatsApp')window.open(buildWhatsAppUrl(lead.phone,message.trim()),'_blank','noopener,noreferrer')
  if(channel==='Instagram')window.open(buildInstagramInboxUrl(),'_blank','noopener,noreferrer')
  notify(`${channel} outreach recorded for ${(lead.company||'lead').replace(/\s*[—-]\s*Website\s*$/i,'')}`)
  const nextIndex=campaignIndex+1
  if(nextIndex<campaignLeads.length)campaignIndexChange(nextIndex)
  else{setCampaignOpen(false);setSelectedIds([]);notify('Outreach campaign completed')}
 }
 async function copyOutreach(){
  if(!outreachMessage)return
  try{await navigator.clipboard.writeText(outreachMessage);setOutreachCopied(true);notify('Outreach message copied');setTimeout(()=>setOutreachCopied(false),1800)}
  catch{notify('Copy failed — select the message and copy it manually')}
 }
 async function recordOutreachActivity(lead, type, message){
  const r=await supabase.from('crm_lead_activity').insert({lead_id:lead.id,activity_type:type,note:`Outreach sent/opened: ${message.trim()}`}).select().single()
  if(r.error){notify(r.error.message);return null}
  const outreachUpdate={outreach_status:'Sent',last_contacted_at:new Date().toISOString(),...(lead.status==='New Lead'?{status:'Contacted'}:{})}
  const updated=await supabase.from('crm_leads').update({...outreachUpdate,updated_at:new Date().toISOString()}).eq('id',lead.id).select().single()
  if(!updated.error){setLeads(x=>x.map(l=>l.id===lead.id?updated.data:l));if(outreachLead?.id===lead.id)setOutreachLead(updated.data);if(intelLead?.id===lead.id)setIntelLead(updated.data);if(proposalLead?.id===lead.id)setProposalLead(updated.data)}
  if(activityLead?.id===lead.id)setActivities(x=>[r.data,...x])
  const now=new Date().toISOString()
  const initialAlreadyRecorded=lead?.initial_outreach?.status&&lead.initial_outreach.status!=='not_sent'
  const outreachUpdate={sequence_status:'active',updated_at:now,...(initialAlreadyRecorded?{}:{initial_outreach:{channel:type,sent_at:now,message_text:message.trim(),status:'initiated'}})}
  if(lead.status==='New Lead')outreachUpdate.status='Contacted'
  const u=await supabase.from('crm_leads').update(outreachUpdate).eq('id',lead.id).select().single()
  if(u.error){notify('Outreach recorded, but lead sequence state update failed');return r.data}
  setLeads(x=>x.map(a=>a.id===lead.id?u.data:a));setOutreachLead(u.data)
  if(activityLead?.id===lead.id)setActivityLead(u.data)
  if(lead.status==='New Lead'){
    const h=await supabase.from('crm_lead_activity').insert({lead_id:lead.id,activity_type:'Stage change',note:`Stage changed from New Lead to Contacted after ${type} outreach.`}).select().single()
    if(!h.error&&activityLead?.id===lead.id)setActivities(x=>[h.data,...x])
  }
  return r.data
}
async function sendOutreach(){
  if(!outreachLead||!outreachMessage.trim()||outreachSending)return
  const company=(outreachLead.company||'your business').replace(/\s*[—-]\s*Website\s*$/i,'')
  const subject=`Quick idea for ${company}`
  const message=outreachMessage.trim()
  if(outreachChannel==='Email'){
    if(!outreachLead.email){notify('This lead has no email address');return}
    const activity=await recordOutreachActivity(outreachLead,'Email',message)
    if(!activity)return
    window.location.href=buildMailtoUrl(outreachLead.email,subject,message)
    notify('Email draft opened and outreach recorded')
    return
  }
  if(outreachChannel==='WhatsApp'){
    if(!normalizeWhatsAppPhone(outreachLead.phone)){notify('This lead has no valid phone number');return}
    const activity=await recordOutreachActivity(outreachLead,'WhatsApp',message)
    if(!activity)return
    window.open(buildWhatsAppUrl(outreachLead.phone,message),'_blank','noopener,noreferrer')
    notify('WhatsApp opened and outreach recorded')
    return
  }
  if(outreachChannel==='Instagram')await launchInstagramOutreach()
}
async function launchInstagramOutreach(){
  if(!outreachLead||!outreachMessage.trim())return
  try{await navigator.clipboard.writeText(outreachMessage.trim());setOutreachCopied(true)}catch{}
  const activity=await recordOutreachActivity(outreachLead,'Instagram',outreachMessage.trim())
  if(!activity)return
  window.open(buildInstagramInboxUrl(),'_blank','noopener,noreferrer')
  notify('Instagram pitch copied and inbox opened')
  setTimeout(()=>setOutreachCopied(false),1800)
}
 function useContactIntelForOutreach(lead,contacts){
  const enriched={
   ...lead,
   email:lead?.email||contacts?.emails?.[0]||null,
   phone:lead?.phone||contacts?.phones?.[0]||null,
   instagram:lead?.instagram||contacts?.instagram?.[0]||null,
  }
  setLeads(x=>x.map(l=>l.id===lead.id?enriched:l))
    openOutreach(enriched)
  notify('Discovered contact details loaded into Outreach Engine')
 }
 function notify(x){setToast(x);setTimeout(()=>setToast(''),3000)}
 async function auth(e){e.preventDefault();setAuthMsg('');const r=mode==='login'?await supabase.auth.signInWithPassword({email,password}):await supabase.auth.signUp({email,password});if(r.error)setAuthMsg(r.error.message);else if(mode==='signup')setAuthMsg('Account created. Check your email if confirmation is enabled.')}
 async function signout(){await supabase.auth.signOut();setLeads([])}
 async function syncHubSpot(){setSyncing(true);try{let {data:{session:currentSession}}=await supabase.auth.getSession();if(!currentSession?.access_token){const refreshed=await supabase.auth.refreshSession();currentSession=refreshed.data.session}if(!currentSession?.access_token){notify('Your login session is missing. Please sign in again.');return}const r=await supabase.functions.invoke('sync-hubspot',{body:{},headers:{Authorization:`Bearer ${currentSession.access_token}`}});if(r.error)notify(r.error.message||'HubSpot sync failed');else if(!r.data?.success)notify(r.data?.error||'HubSpot sync failed');else{const loaded=await load();const duplicateCount=findPotentialDuplicateLeads(loaded||[]).length;notify(`${r.data.synced} HubSpot deals synchronized${duplicateCount?` · ${duplicateCount} potential duplicate${duplicateCount===1?'':'s'} flagged`:''}`)}}catch(error){notify(error instanceof Error?error.message:'HubSpot sync failed')}finally{setSyncing(false)}}
 function buildIntelligenceReport(result, checks=intelChecks){
  if(!intelLead)return
  const rows=[['Mobile experience',checks.mobile],['Clear call-to-action',checks.cta],['Contact options',checks.contact],['E-commerce opportunity',checks.ecommerce],['Basic SEO readiness',checks.seo]]
  const hasWebsite=Boolean(intelLead.website||intelUrl.trim())
  const assessment=assessIntelligence(checks,hasWebsite)
  const score=result?.score ?? (hasWebsite?assessment.score:5)
  const service=result?.recommended_service || assessment.recommendedService
  const value=result?.estimated_value ? money(result.estimated_value) : money(assessment.estimatedValue)
  const gaps=rows.filter(x=>!x[1]).map(x=>x[0])
  const company=(intelLead.company||'Prospect').replace(/\s*[—-]\s*Website\s*$/i,'')
  const rawContext=(intelLead.niche||'')+' '+company
  const businessContext=rawContext.toLowerCase().match(/real estate|property|properties/) ? {label:'Real Estate',capabilities:['• Mobile-first property listings and search','• Property galleries with clear details and enquiry actions','• WhatsApp, phone and enquiry options','• Location-focused property pages','• Basic SEO for local property discovery'],discovery:['• Which property types should be featured first?','• Do you have property photos, prices, locations and key details ready?','• Should enquiries go to WhatsApp, phone, email or a form?']} : rawContext.toLowerCase().match(/fashion|clothing|boutique|closet|beads|jewell?ery|jewels|accessor/) ? {label:'Fashion & Retail',capabilities:['• Mobile-first product presentation','• Clear product categories and collections','• WhatsApp/contact enquiry flow','• Product gallery or catalogue','• Basic SEO and local discovery setup'],discovery:['• Which products or collections should be highlighted first?','• Do you have product photos, prices and categories ready?','• Should customers browse products before contacting you?']} : rawContext.toLowerCase().match(/restaurant|food|outlet|bakery|cafe|café|catering|sweet/) ? {label:'Food & Hospitality',capabilities:['• Mobile-first menu and service presentation','• Clear ordering, booking or enquiry calls to action','• Menu, gallery and contact sections','• WhatsApp, phone or reservation options','• Basic local SEO setup'],discovery:['• Which menu items or services should be featured first?','• Do you already have photos, prices/menu details and opening hours?','• Should customers order, book or enquire through WhatsApp, phone or a form?']} : rawContext.toLowerCase().match(/electronics|tech|technology|computer|phone|mobile|gadget/) ? {label:'Electronics & Technology',capabilities:['• Mobile-first product catalogue','• Product categories and key specifications','• WhatsApp/contact enquiry flow','• Product gallery and featured items','• Basic SEO and local discovery setup'],discovery:['• Which product categories should be featured first?','• Do you have product photos, prices and specifications ready?','• Should customers enquire through WhatsApp, phone, email or a form?']} : rawContext.toLowerCase().match(/salon|beauty|spa|barber/) ? {label:'Beauty & Personal Care',capabilities:['• Mobile-first service presentation','• Clear booking and enquiry calls to action','• Services, pricing and gallery sections','• WhatsApp, phone or booking options','• Basic local SEO setup'],discovery:['• Which services should be highlighted first?','• Do you have service details, pricing, photos and opening hours ready?','• Should customers book through WhatsApp, phone or an online form?']} : rawContext.toLowerCase().match(/church|ministry|faith/) ? {label:'Church & Ministry',capabilities:['• Mobile-first church information and service schedule','• Clear service, event and contact calls to action','• Ministries, events and media sections','• WhatsApp, phone and enquiry options','• Basic local SEO setup'],discovery:['• Which services, ministries or events should be featured first?','• Do you have service times, location, photos and contact details ready?','• Should visitors contact the church through WhatsApp, phone, email or a form?']} : {label:'General Business',capabilities:['• Mobile-first business presentation','• Clear service or offering sections and calls to action','• Contact, WhatsApp or enquiry options','• Structured content and media sections','• Basic SEO and local discovery setup'],discovery:['• What products or services should the website highlight first?','• Do you already have business photos, branding and contact details?','• Should customers enquire through WhatsApp, phone, email or a form?']}
  const industry=intelLead.niche||businessContext.label
  const location=intelLead.location||'Not provided'
  const contact=intelLead.contact_name||'Not provided'
  const website=intelUrl||intelLead.website||'Not provided'
  const reportTitle=hasWebsite?'WEBSITE OPPORTUNITY REPORT':'NEW WEBSITE OPPORTUNITY REPORT'
  const capabilities=hasWebsite ? (result?.opportunities?.length?result.opportunities.map(x=>'• '+x):(gaps.length?gaps.map(x=>'• Improve '+x.toLowerCase()):['• Strengthen the existing website experience and conversion path'])) : businessContext.capabilities
  const findings=result?.findings?.length?result.findings.map(x=>'• '+x):hasWebsite?['• Existing website available for review.']:['• No verified website is currently saved for this prospect.','• Treat this as a new website opportunity rather than an existing-site audit.']
  const discovery=businessContext.discovery
  const pitch=hasWebsite
    ? 'Use the findings above to start a conversation around improving the current online experience and customer journey.'
    : `A professional website could establish a modern, high-converting digital presence for ${company}, making it easier for customers to discover the business, understand its offerings and make enquiries.`
  const report=[reportTitle,'',
    'PROSPECT OVERVIEW',
    'Business: '+company,
    'Contact: '+contact,
    'Industry: '+industry,
    'Location: '+location,
    'Website: '+website,
    '',
    'OPPORTUNITY SUMMARY',
    'Opportunity type: '+(hasWebsite?'Website improvement / audit':'New website'),
    'Opportunity score: '+score+'/5',
    'Estimated project value: '+value,
    '',
    'CURRENT DIGITAL POSITION',
    ...findings,
    '',
    'RECOMMENDED WEBSITE CAPABILITIES',
    ...capabilities,
    '',
    'SALES ANGLE',
    '• '+pitch,
    '',
    'DISCOVERY QUESTIONS',
    ...discovery,
    '',
    'RECOMMENDED SERVICE',
    service,
    'ESTIMATED PROJECT VALUE',
    value,
    '',
    'NEXT ACTION',
    '• Confirm the prospect needs and priorities.',
    '• Show a relevant demo or example.',
    '• Generate a tailored proposal after discovery.',
    '',
    'PROPOSAL HANDOFF',
    'Service: '+service,
    'Investment: '+value,
    'Timeline: '+(service==='E-commerce Website'?'10–14 business days':service==='Custom Web Application'?'14–21 business days':'7–10 business days'),
    '',
    'Prepared by JohnKay Fundz'
  ].filter(Boolean).join('\n')
  setIntelReport(report)
  return {report,analysis:{score:Number(score),checks,findings:findings.map(x=>String(x).replace(/^•\s*/,'')),opportunities:capabilities.map(x=>String(x).replace(/^•\s*/,'')),sales_angle:pitch,recommended_service:service,estimated_value:Number(result?.estimated_value??assessment.estimatedValue)}}
 }
 async function generateIntelligence(){
  if(!intelLead||intelGenerating)return
  setIntelGenerating(true)
  try{
   const built=buildIntelligenceReport(null,intelChecks)
   if(!built?.report)throw new Error('Unable to build the opportunity report.')
   const saved=await saveIntelligenceReport(built.analysis,intelChecks)
   if(!saved)notify('Opportunity report generated, but it could not be saved to history.')
   else notify('Opportunity report generated and saved')
  }catch(error){
   notify(error instanceof Error?error.message:'Opportunity report generation failed')
  }finally{setIntelGenerating(false)}
 }
 async function saveLeadWebsite(){
  if(!intelLead||!intelUrl.trim())return
  let website=''
  try{website=normalizeWebsiteUrl(intelUrl)}catch(error){notify(error instanceof Error?error.message:'Enter a valid website URL');return}
  const r=await supabase.from('crm_leads').update({website,updated_at:new Date().toISOString()}).eq('id',intelLead.id).select().single()
  if(r.error){notify(r.error.message);return}
  setLeads(x=>x.map(a=>a.id===r.data.id?r.data:a));setIntelLead(r.data);setIntelUrl(r.data.website||website);notify('Website saved to lead')
 }
 async function analyzeWebsite(){
  if(!intelLead||!intelUrl.trim()||intelAnalyzing)return
  const parsed=intelligenceSchema.safeParse({url:intelUrl.trim(),checks:intelChecks});if(!parsed.success){notify(parsed.error.issues[0]?.message||'Enter a valid website URL');return}
  setIntelAnalyzing(true);setIntelReport('');setIntelResult(null)
  try{
   const r=await supabase.functions.invoke('analyze-website',{body:{url:intelUrl.trim()}})
   if(r.error||!r.data?.success){notify(r.data?.error||r.error?.message||'Website analysis failed');return}
   const nextChecks=r.data.checks||{mobile:false,cta:false,contact:false,ecommerce:false,seo:false}
   setIntelChecks(nextChecks);setIntelResult(r.data);setProposalAnalyses(x=>({...x,[intelLead.id]:r.data}));const built=buildIntelligenceReport(r.data,nextChecks);await saveIntelligenceReport({...r.data,...(built?.analysis||{})},nextChecks);const historyNote='Website opportunity report saved. Score: '+r.data.score+'/5. Recommended service: '+r.data.recommended_service+'. Estimated value: '+money(r.data.estimated_value)+'. '+cleanText((r.data.opportunities||[]).join(' '),1500);const h=await supabase.from('crm_lead_activity').insert({lead_id:intelLead.id,activity_type:'Note',note:historyNote}).select().single();if(h.error)notify('Analysis complete, but history save failed: '+h.error.message);notify('Website analyzed successfully · report saved to lead history')
  }catch(error){notify(error instanceof Error?error.message:'Website analysis failed')}
  finally{setIntelAnalyzing(false)}
 }
 async function copyIntelligence(){if(!intelReport)return;try{await navigator.clipboard.writeText(intelReport);setIntelCopied(true);notify('Opportunity report copied');setTimeout(()=>setIntelCopied(false),1800)}catch{notify('Copy failed — select the report and copy it manually')}}
 function proposalDefaults(l){
  const analysis=proposalAnalyses[l?.id]||(intelResult&&intelLead?.id===l?.id?intelResult:null)
  const storedOpportunity=l?.opportunity_type||''
  const opportunityService={'Catalogue Upgrade':'E-commerce Website','E-commerce UX Audit':'E-commerce Website','UX/Conversion Audit':'Website Redesign','UX/Conversion':'Website Redesign','Brand Platform':'Business Website','New Website':'Business Website'}[storedOpportunity]
  const service=opportunityService||analysis?.recommended_service||'Business Website'
  const price=Number(l?.deal_value||0)>0?String(l.deal_value):String(analysis?.estimated_value||({ 'E-commerce Website':250000,'Website Redesign':120000,'Custom Web Application':350000,'React/MERN Development':200000 }[service]||150000))
  const timeline=service==='E-commerce Website'?'10–14 business days':service==='Custom Web Application'?'14–21 business days':'7–10 business days'
  return {service,price:String(price),timeline}
 }
 async function buildProposal(l=proposalLead,service=proposalService,price=proposalPrice,timeline=proposalTimeline){
  if(!l||proposalGenerating)return
  const validated=proposalSchema.safeParse({service,investment:price,timeline,taxRate:proposalTaxRate});if(!validated.success){notify(validated.error.issues[0]?.message||'Check proposal values');return}
  setProposalGenerating(true)
  try{
  const investment=Number(price||0),taxRate=Number(proposalTaxRate||0),tax=investment*taxRate/100,total=investment+tax
  const milestones=[{label:'Project start',percent:50,amount:investment*.5},{label:'Final delivery',percent:50,amount:investment*.5}]
  const company=(l.company||'your business').replace(/\s*[—-]\s*Website\s*$/i,'')
  const analysis=proposalAnalyses[l?.id]||(intelResult&&intelLead?.id===l.id?intelResult:null)
  const findings=analysis?.findings||[]
  const opportunities=proposalOpportunity?.leadId===l.id?proposalOpportunity.keyOpportunities:(analysis?.opportunities||[])
  const deliverables=service==='E-commerce Website'?['Responsive product-focused storefront','Product/category pages and clear calls to action','Mobile-first shopping experience','Contact/order flow and conversion improvements','Basic SEO-ready page structure']:service==='Website Redesign'?['Modern responsive redesign','Improved navigation and conversion flow','Mobile experience improvements','Clear contact and call-to-action sections','Basic SEO-ready page structure']:service==='Custom Web Application'?['Responsive application interface','Core workflow and dashboard screens','Frontend integration and validation','Deployment-ready production build','Handover and basic usage guidance']:['Modern responsive business website','Professional homepage and service/product sections','Mobile-first layout and clear calls to action','Contact/inquiry integration','Basic SEO-ready page structure']
  const lines=['WEBSITE PROJECT PROPOSAL','','Prepared for: '+company,'Contact: '+(l.contact_name||'Not provided'),'Prepared by: John Kalumba — JohnKay Fundz','','PROJECT OVERVIEW',`${service==='Business Website' ? `I propose establishing a modern, high-converting digital presence for ${company}, with a professional mobile experience, clear customer journeys, and strong opportunities to turn visitors into enquiries.` : service==='Website Redesign' ? `I propose redesigning ${company}'s existing website with a more professional mobile experience, clearer customer journeys, and stronger conversion opportunities.` : `I propose delivering a ${service.toLowerCase()} for ${company}, focused on a professional user experience, clear customer journeys, and stronger conversion opportunities.`}`, '', 'RECOMMENDED SOLUTION',service,'', 'KEY OPPORTUNITIES',...(opportunities.length?opportunities.map(x=>'• '+x):[service==='Website Redesign'?'• Improve the existing website experience and conversion path':'• Establish a professional online presence and clear customer enquiry path']),...(findings.length?['','ANALYSIS FINDINGS',...findings.map(x=>'• '+x)]:[]),'','DELIVERABLES',...deliverables.map(x=>'• '+x),'','TIMELINE',timeline,'','INVESTMENT',money(investment),'','TAX ('+taxRate+'%)',money(tax),'','TOTAL CLIENT INVESTMENT',money(total),'','MILESTONE PAYMENTS',...milestones.map(m=>m.percent+'% · '+m.label+' · '+money(m.amount)),'','NEXT STEPS','1. Confirm the scope and required content.','2. Provide the business information, images and other assets needed for the build.','3. Approve the project start and payment arrangement.','4. Development, review and final delivery.','','Thank you for considering JohnKay Fundz. I’d be happy to discuss the project and tailor the scope to your exact needs.','','John Kalumba','JohnKay Fundz'].join('\n')
  setProposalText(lines)
  const proposalPayload={
   lead_id:l.id,
   service:validated.data.service,
   investment,
   tax_rate:taxRate,
   tax,
   total,
   timeline:validated.data.timeline,
   milestones,
   markdown:lines,
   status:'draft'
  }
  const saved=await supabase.from('crm_proposals').insert(proposalPayload).select().single()
  if(saved.error){notify('Proposal generated, but draft persistence failed: '+saved.error.message)}
  else notify('Proposal generated and saved to the CRM')
  }catch(error){notify(error instanceof Error?error.message:'Proposal generation failed')}
  finally{setProposalGenerating(false)}
 }
 function downloadProposalMarkdown(){
 if(!proposalText)return
 const blob=new Blob([proposalText],{type:'text/markdown;charset=utf-8'})
 const url=URL.createObjectURL(blob),a=document.createElement('a')
 a.href=url;a.download=(proposalLead?.company||'johnkay-proposal').replace(/[^a-z0-9]+/gi,'-').toLowerCase()+'.md'
 document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);notify('Markdown proposal downloaded')
}
async function printProposal(){if(!proposalLead||!proposalText||proposalPdfBusy)return;setProposalPdfBusy(true);try{const analysis=proposalAnalyses[proposalLead.id]||(intelResult&&intelLead?.id===proposalLead.id?intelResult:null);const investment=Number(proposalPrice||0);const taxRate=Number(proposalTaxRate||0);const tax=investment*taxRate/100;const total=investment+tax;const service=proposalService;const opportunities=proposalOpportunity?.leadId===proposalLead.id?proposalOpportunity.keyOpportunities:(analysis?.opportunities||[]);const findings=analysis?.findings||[];const deliverables=service==='E-commerce Website'?['Responsive product-focused storefront','Product/category pages and clear calls to action','Mobile-first shopping experience','Contact/order flow and conversion improvements','Basic SEO-ready page structure']:service==='Website Redesign'?['Modern responsive redesign','Improved navigation and conversion flow','Mobile experience improvements','Clear contact and call-to-action sections','Basic SEO-ready page structure']:service==='Custom Web Application'?['Responsive application interface','Core workflow and dashboard screens','Frontend integration and validation','Deployment-ready production build','Handover and basic usage guidance']:['Modern responsive business website','Professional homepage and service/product sections','Mobile-first layout and clear calls to action','Contact/inquiry integration','Basic SEO-ready page structure'];await downloadProposalPdf({company:(proposalLead.company||'your business').replace(/\\s*[—-]\\s*Website\\s*$/i,''),contact:proposalLead.contact_name,service,timeline:proposalTimeline,investment,taxRate,tax,total,opportunities,findings,deliverables});notify('Branded PDF downloaded')}catch(error){notify(error instanceof Error?error.message:'PDF export failed')}finally{setProposalPdfBusy(false)}}
function generateProposal(){buildProposal()}
 async function copyProposal(){if(!proposalText)return;try{await navigator.clipboard.writeText(proposalText);setProposalCopied(true);notify('Proposal copied');setTimeout(()=>setProposalCopied(false),1800)}catch{notify('Copy failed — select the proposal and copy it manually')}}
 async function markProposalSent(){
  if(!proposalLead||!proposalText||proposalTracking)return
  setProposalTracking(true)
  try{
   const followUp=new Date();followUp.setDate(followUp.getDate()+3);const followUpDate=`${followUp.getFullYear()}-${String(followUp.getMonth()+1).padStart(2,'0')}-${String(followUp.getDate()).padStart(2,'0')}`
   const value=Number(proposalPrice||0)
   const nextScore=calculateLeadScore({...proposalLead,status:'Proposal Sent',deal_value:value}); const u=await supabase.from('crm_leads').update({status:'Proposal Sent',deal_value:value,score:nextScore.score,score_tier:nextScore.scoreTier,next_follow_up:followUpDate,updated_at:new Date().toISOString()}).eq('id',proposalLead.id).select().single()
   if(u.error){notify(u.error.message);return}
   const a=await supabase.from('crm_lead_activity').insert({lead_id:proposalLead.id,activity_type:'Proposal Sent',note:`Proposal prepared and marked as sent. Service: ${proposalService}. Investment: ${money(value)}. Follow-up scheduled for ${followUpDate}.`}).select().single()
   if(a.error){notify(a.error.message);return}
   await supabase.from('crm_proposals').update({status:'sent'}).eq('lead_id',proposalLead.id).eq('status','draft')
   setLeads(x=>x.map(l=>l.id===u.data.id?u.data:l));setProposalLead(u.data)
   if(activityLead?.id===u.data.id)setActivities(x=>[a.data,...x])
   notify(`Proposal marked sent · ${money(value)} · follow-up ${followUpDate}`)
  }catch(error){notify(error instanceof Error?error.message:'Proposal tracking failed')}
  finally{setProposalTracking(false)}
 }
 const followUpStatusForLead=(lead)=>getFollowUpSchedule(lead,now).map(item=>item.status)
 const filtered=useMemo(()=>{const q=query.toLowerCase().trim();return leads.filter(l=>{const matchesSearch=!q||[l.company,l.contact_name,l.email,l.niche,l.location,l.source].some(v=>String(v||'').toLowerCase().includes(q));const matchesStage=status==='All'||l.status===status;const matchesSource=source==='All'||l.source===source;const statuses=followUpStatusForLead(l);const matchesFollowUp=followUpFilter==='All'||(followUpFilter==='Due'&&statuses.some(s=>s==='due'||s==='overdue'))||(followUpFilter==='Overdue'&&statuses.includes('overdue'))||(followUpFilter==='Due Today'&&statuses.includes('due'))||(followUpFilter==='Upcoming'&&statuses.includes('upcoming'))||(followUpFilter==='No Follow-up'&&!statuses.length);return matchesSearch&&matchesStage&&matchesSource&&matchesFollowUp})},[leads,query,status,source,followUpFilter])
 const sorted=useMemo(()=>[...filtered].sort((a,b)=>{const an=Number(a?.score??0),bn=Number(b?.score??0);const av=String(a?.[sortKey]??'').toLowerCase(),bv=String(b?.[sortKey]??'').toLowerCase();const cmp=sortKey==='score'||sortKey==='deal_value'?an-bn:av.localeCompare(bv);return sortDir==='asc'?cmp:-cmp}),[filtered,sortKey,sortDir])
 const pageCount=Math.max(1,Math.ceil(sorted.length/pageSize));const safePage=Math.min(page,pageCount);const paged=sorted.slice((safePage-1)*pageSize,safePage*pageSize)
 function sortBy(key){setPage(1);if(key==='score'){setSortKey('score');setSortDir('desc');return}if(sortKey===key)setSortDir(x=>x==='asc'?'desc':'asc');else{setSortKey(key);setSortDir('asc')}}
 useEffect(()=>{setPage(1)},[query,status,source,followUpFilter])
 const pipelineMetrics=useMemo(()=>calculatePipelineMetrics(leads,today()),[leads])
 const followUpSummary=useMemo(()=>getFollowUpQueueSummary(leads,now),[leads,now])
 const metrics={...pipelineMetrics,due:followUpSummary.due.length}
 const sources=[...new Set(leads.map(l=>l.source).filter(Boolean))]
 const followUps=useMemo(()=>{
   const build=(status)=>leads.flatMap(lead=>{
     const item=getFollowUpSchedule(lead,now).find(schedule=>schedule.status===status)
     return item?[{...lead,next_follow_up:item.scheduled_for}]:[]
   }).sort((a,b)=>String(a.next_follow_up||'').localeCompare(String(b.next_follow_up||'')))
   return {overdue:build('overdue'),today:build('due'),upcoming:build('upcoming').slice(0,5)}
 },[leads,followUpSummary,now])
 function edit(l){setForm({...l,deal_value:l.deal_value||''});setModal(true)}
 async function save(e){
 e.preventDefault();setSaving(true)
 let normalizedWebsite=''
 try{normalizedWebsite=normalizeWebsiteUrl(cleanText(form.website,500))}catch(error){notify(error instanceof Error?error.message:'Invalid website URL');setSaving(false);return}
 const candidate={...form,company:titleCaseName(cleanText(form.company,120)),contact_name:titleCaseName(cleanText(form.contact_name,100)),role:titleCaseName(cleanText(form.role,100)),email:cleanText(form.email,160).toLowerCase(),phone:cleanText(form.phone,30),website:normalizedWebsite,instagram:cleanText(form.instagram,120),niche:titleCaseName(cleanText(form.niche,100)),location:titleCaseName(cleanText(form.location,100)),source:cleanText(form.source,60),notes:cleanText(form.notes,2000),deal_value:form.deal_value?Number(form.deal_value):0,updated_at:new Date().toISOString()}
 const duplicate=findLeadDuplicate(leads,candidate,form.id)
 if(duplicate){notify(duplicate.reason==='website'?'Duplicate lead: this website is already in your CRM.':'Duplicate lead: this company and contact are already in your CRM.');setSaving(false);return}
 const parsed=leadSchema.safeParse(candidate)
 if(!parsed.success){notify(parsed.error.issues[0]?.message||'Please check the lead details');setSaving(false);return}
 const scored=calculateLeadScore({...parsed.data,status:parsed.data.status||'New Lead'}); const p={...parsed.data,score:scored.score,score_tier:scored.scoreTier};delete p.id;delete p.owner_id;delete p.created_at
 const r=form.id?await supabase.from('crm_leads').update(p).eq('id',form.id).select().single():await supabase.from('crm_leads').insert(p).select().single()
 if(r.error)notify(r.error.message);else{const scored={...r.data,...calculateLeadScore(r.data)};setLeads(x=>form.id?x.map(a=>a.id===r.data.id?scored:a):[scored,...x]);setModal(false);notify(form.id?'Lead updated':'Lead added')}
 setSaving(false)
}
 async function remove(id){if(!confirm('Delete this lead?'))return;const r=await supabase.from('crm_leads').delete().eq('id',id);if(r.error)notify(r.error.message);else{setLeads(x=>x.filter(a=>a.id!==id));notify('Lead deleted')}}
 async function move(l,s){if(s===l.status)return;const closedStage=['Won','Lost'].includes(s);const nextScore=calculateLeadScore({...l,status:s});const r=await supabase.from('crm_leads').update({status:s,next_follow_up:closedStage?null:l.next_follow_up,score:nextScore.score,score_tier:nextScore.scoreTier,updated_at:new Date().toISOString()}).eq('id',l.id).select().single();if(r.error)notify(r.error.message);else{setLeads(x=>x.map(a=>a.id===l.id?r.data:a));const h=await supabase.from('crm_lead_activity').insert({lead_id:l.id,activity_type:'Stage change',note:'Stage changed from '+l.status+' to '+s+'.'}).select().single();if(h.error)notify('Stage updated, but history logging failed');else if(activityLead?.id===l.id)setActivities(x=>[h.data,...x]);notify('Stage moved to '+s)}}
 if(loading)return <div className="center"><div className="loader"/>Loading Client Engine…</div>
 if(!supabase)return <div className="center"><div className="auth"><b className="logo">JK</b><h1>Client Engine</h1><p>Supabase environment configuration is invalid. {envError||'Check your production environment variables.'}</p></div></div>
 if(!session)return <div className="center auth-bg"><form className="auth" onSubmit={auth}><b className="logo">JK</b><small>PRIVATE BUSINESS TOOL</small><h1>JohnKay Client Engine</h1><p>One private workspace for leads, follow-ups and deal tracking.</p><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength="6"/></label>{authMsg&&<em>{authMsg}</em>}<button className="primary wide">{mode==='login'?'Sign in':'Create account'}</button><button type="button" className="link" onClick={()=>setMode(mode==='login'?'signup':'login')}>{mode==='login'?'Create a new account':'Back to sign in'}</button></form></div>
 return <div className="shell"><aside><div className="brand"><b className="logo">JK</b><span><strong>JohnKay</strong><small>Client Engine</small></span></div><nav><button className="active"><BarChart3/>Overview</button><button onClick={()=>document.getElementById('leads').scrollIntoView({behavior:'smooth'})}><Users/>Leads</button><button onClick={()=>{setForm({...empty});setModal(true)}}><Plus/>Add Lead</button><button onClick={()=>{const l=leads[0];if(l)openOutreach(l)}}><ExternalLink/>Outreach</button><button onClick={()=>document.getElementById("intelligence").scrollIntoView({behavior:"smooth"})}><Target/>Intelligence</button></nav><div className="asideBottom"><div className="tip"><Target/>Turn prospects into paying clients.</div><button onClick={signout}><LogOut/>Sign out</button></div></aside>
 <main><header><div><small>PRIVATE WORKSPACE</small><h1>Client acquisition, in one place.</h1><p>Track prospects, follow-ups and potential revenue without rebuilding your workflow every time.</p></div><div className="headerActions"><button className="secondary" onClick={syncHubSpot} disabled={syncing}><RefreshCw className={syncing?"spin":""}/>{syncing?"Syncing…":"Sync HubSpot"}</button><button className="primary" onClick={()=>{setForm({...empty});setModal(true)}}><Plus/>Add lead</button></div></header>
 <LeadIntelligence leads={leads} intelLead={intelLead} setIntelLead={setIntelLead} intelUrl={intelUrl} setIntelUrl={setIntelUrl} setIntelReport={setIntelReport} setIntelResult={setIntelResult} setIntelChecks={setIntelChecks} intelChecks={intelChecks} saveLeadWebsite={saveLeadWebsite} analyzeWebsite={analyzeWebsite} intelAnalyzing={intelAnalyzing} intelGenerating={intelGenerating} generateIntelligence={generateIntelligence} intelResult={intelResult} intelReport={intelReport} copyIntelligence={copyIntelligence} intelCopied={intelCopied} intelligenceHistory={intelligenceHistory} applyIntelligenceReport={applyIntelligenceReport} onGenerateProposalFromOpportunity={generateProposalFromOpportunity} onLeadUpdated={updated=>{setLeads(x=>x.map(l=>l.id===updated.id?{...updated,...calculateLeadScore(updated)}:l));if(intelLead?.id===updated.id)setIntelLead({...updated,...calculateLeadScore(updated)})}} onUseContactIntel={useContactIntelForOutreach}/><ProposalGenerator money={money} proposalAnalyses={proposalAnalyses} intelResult={intelResult} intelLead={intelLead} leads={leads} proposalLead={proposalLead} setProposalLead={setProposalLead} setProposalOpportunity={setProposalOpportunity} setProposalText={setProposalText} setProposalCopied={setProposalCopied} proposalDefaults={proposalDefaults} proposalService={proposalService} setProposalService={setProposalService} proposalPrice={proposalPrice} setProposalPrice={setProposalPrice} proposalTaxRate={proposalTaxRate} setProposalTaxRate={setProposalTaxRate} proposalTimeline={proposalTimeline} setProposalTimeline={setProposalTimeline} proposalText={proposalText} generateProposal={generateProposal} proposalTracking={proposalTracking} proposalGenerating={proposalGenerating} markProposalSent={markProposalSent} copyProposal={copyProposal} proposalCopied={proposalCopied} downloadProposalMarkdown={downloadProposalMarkdown} printProposal={printProposal} proposalPdfBusy={proposalPdfBusy} proposalOpportunity={proposalOpportunity}/><OutreachEngine leads={leads} outreachLead={outreachLead} openOutreach={openOutreach} outreachChannel={outreachChannel} setOutreachChannel={setOutreachChannel} outreachTemplate={outreachTemplate} setOutreachMessage={setOutreachMessage} outreachMessage={outreachMessage} copyOutreach={copyOutreach} outreachCopied={outreachCopied} sendOutreach={sendOutreach} launchInstagramOutreach={launchInstagramOutreach} outreachSending={outreachSending}/><DashboardSummary metrics={metrics} followUps={followUps} openActivity={openActivity} onReviewFollowUp={lead=>{const fullLead=leads.find(item=>String(item.id)===String(lead.id));if(fullLead)openFollowUpReview(fullLead)}} money={money}/><ActionCenter onReviewFollowUp={openFollowUpReview} leads={leads} metrics={metrics} followUps={followUps} openActivity={openActivity} openOutreach={openOutreach} setForm={setForm} setModal={setModal} empty={empty} money={money}/><LeadPipeline selectedIds={selectedIds} setSelectedIds={setSelectedIds} onGenerateCampaign={openCampaign} filtered={filtered} sorted={sorted} paged={paged} safePage={safePage} setPage={setPage} pageCount={pageCount} pageSize={pageSize} query={query} setQuery={setQuery} status={status} setStatus={setStatus} source={source} setSource={setSource} followUpFilter={followUpFilter} setFollowUpFilter={setFollowUpFilter} sources={sources} stages={stages} tone={tone} sortBy={sortBy} sortKey={sortKey} move={move} today={today} money={money} contactAction={contactAction} openActivity={openActivity} edit={edit} remove={remove} setForm={setForm} setModal={setModal} empty={empty}/></main>
 <OutreachCampaignModal open={campaignOpen} leads={campaignLeads} index={campaignIndex} setIndex={campaignIndexChange} channel={campaignChannel} setChannel={campaignChannelChange} message={campaignMessage} setMessage={setCampaignMessage} copied={campaignCopied} copyMessage={copyCampaignMessage} dispatch={dispatchCampaignLead} close={()=>setCampaignOpen(false)}/><LeadModals followUpReviewLead={followUpReviewLead} setFollowUpReviewLead={setFollowUpReviewLead} followUpReviewSequence={followUpReviewSequence} followUpReviewChannel={followUpReviewChannel} setFollowUpReviewChannel={value=>{setFollowUpReviewChannel(value);if(followUpReviewLead)setFollowUpReviewMessage(generateFollowUpMessage({lead:followUpReviewLead,sequenceNumber:followUpReviewSequence,channel:value}))}} followUpReviewMessage={followUpReviewMessage} setFollowUpReviewMessage={setFollowUpReviewMessage} regenerateFollowUpReview={regenerateFollowUpReview} markFollowUpSent={markFollowUpSent} followUpReviewBusy={followUpReviewBusy} modal={modal} setModal={setModal} form={form} setForm={setForm} save={save} saving={saving} stages={stages} activityLead={activityLead} setActivityLead={setActivityLead} followUpMessage={followUpMessage} followUpCopied={followUpCopied} followUpMessageLoading={followUpMessageLoading} copyFollowUp={copyFollowUp} followUpMethod={followUpMethod} setFollowUpMethod={value=>{setFollowUpMethod(value);if(value==='Email'||value==='Instagram'||value==='WhatsApp')refreshFollowUpMessage(value)}} followUpOutcome={followUpOutcome} setFollowUpOutcome={setFollowUpOutcome} followUpNextDate={followUpNextDate} setFollowUpNextDate={setFollowUpNextDate} followUpNote={followUpNote} setFollowUpNote={setFollowUpNote} today={today} completeFollowUp={completeFollowUp} completingFollowUp={completingFollowUp} activityType={activityType} setActivityType={setActivityType} activityNote={activityNote} setActivityNote={setActivityNote} activityFollowUp={activityFollowUp} setActivityFollowUp={setActivityFollowUp} addActivity={addActivity} activitySaving={activitySaving} activityLoading={activityLoading} activities={activities} activityLabel={activityLabel} deleteActivity={deleteActivity}/>{toast&&<div className="toast"><Check/>{toast}</div>}</div>
}
