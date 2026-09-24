import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { BarChart3, Bell, BriefcaseBusiness, Check, ChevronDown, Copy, ExternalLink, Filter, LogOut, Plus, RefreshCw, Search, Target, Trash2, Users, X, ArrowUpDown, ChevronLeft, ChevronRight, FileDown } from 'lucide-react'
import { leadSchema, intelligenceSchema, proposalSchema, cleanText } from './lib/validation'
import { assessIntelligence, normalizeWebsiteUrl } from './utils/intelligence'
import { Metric, Select, FollowupCard } from './components/Ui'
import { LeadIntelligence } from './components/LeadIntelligence'
import { DashboardSummary } from './components/DashboardSummary'
import { LeadModals } from './components/LeadModals'
import { LeadPipeline } from './components/LeadPipeline'
import { ProposalGenerator } from './components/ProposalGenerator'
import { OutreachEngine } from './components/OutreachEngine'


const supabase = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  ? createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
  : null

const stages=['New Lead','Contacted','Replied','Interested','Proposal Sent','Won','Lost']
const tone={ 'New Lead':'blue',Contacted:'indigo',Replied:'violet',Interested:'amber','Proposal Sent':'orange',Won:'green',Lost:'red' }
const empty={company:'',contact_name:'',role:'',email:'',phone:'',website:'',instagram:'',niche:'',location:'',source:'Manual',status:'New Lead',deal_value:'',next_follow_up:'',notes:''}
const money=v=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(Number(v||0))
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}

export default function App(){
 const [session,setSession]=useState(null),[loading,setLoading]=useState(true),[mode,setMode]=useState('login')
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[authMsg,setAuthMsg]=useState('')
 const [leads,setLeads]=useState([]),[query,setQuery]=useState(''),[status,setStatus]=useState('All'),[source,setSource]=useState('All'),[sortKey,setSortKey]=useState('updated_at'),[sortDir,setSortDir]=useState('desc'),[page,setPage]=useState(1),[pageSize]=useState(10)
 const [modal,setModal]=useState(false),[form,setForm]=useState(empty),[saving,setSaving]=useState(false),[syncing,setSyncing]=useState(false),[toast,setToast]=useState('')
 const [activityLead,setActivityLead]=useState(null),[activities,setActivities]=useState([]),[activityType,setActivityType]=useState('Note'),[activityNote,setActivityNote]=useState(''),[activityFollowUp,setActivityFollowUp]=useState(''),[activityLoading,setActivityLoading]=useState(false),[activitySaving,setActivitySaving]=useState(false),[completingFollowUp,setCompletingFollowUp]=useState(false),[followUpMethod,setFollowUpMethod]=useState('Call'),[followUpOutcome,setFollowUpOutcome]=useState('Needs follow-up'),[followUpNote,setFollowUpNote]=useState(''),[followUpNextDate,setFollowUpNextDate]=useState('')
 const [outreachLead,setOutreachLead]=useState(null),[outreachChannel,setOutreachChannel]=useState('Email'),[outreachMessage,setOutreachMessage]=useState(''),[outreachCopied,setOutreachCopied]=useState(false),[outreachSending,setOutreachSending]=useState(false)
 const [intelLead,setIntelLead]=useState(null),[intelUrl,setIntelUrl]=useState(''),[intelChecks,setIntelChecks]=useState({mobile:false,cta:false,contact:false,ecommerce:false,seo:false}),[intelReport,setIntelReport]=useState(''),[intelCopied,setIntelCopied]=useState(false),[intelAnalyzing,setIntelAnalyzing]=useState(false),[intelResult,setIntelResult]=useState(null)
 const [proposalLead,setProposalLead]=useState(null),[proposalService,setProposalService]=useState('Business Website'),[proposalPrice,setProposalPrice]=useState('150000'),[proposalTimeline,setProposalTimeline]=useState('7–10 business days'),[proposalTaxRate,setProposalTaxRate]=useState('0'),[proposalText,setProposalText]=useState(''),[proposalCopied,setProposalCopied]=useState(false),[proposalAnalyses,setProposalAnalyses]=useState({}),[proposalTracking,setProposalTracking]=useState(false),[proposalPdfBusy,setProposalPdfBusy]=useState(false)

 useEffect(()=>{if(!supabase){setLoading(false);return} supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false)});const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));return()=>subscription.unsubscribe()},[])
 useEffect(()=>{if(!session)return;load();const channel=supabase.channel('crm-live').on('postgres_changes',{event:'*',schema:'public',table:'crm_leads'},()=>load()).subscribe();return()=>{supabase.removeChannel(channel)}},[session])
 async function load(){const {data,error}=await supabase.from('crm_leads').select('*').order('updated_at',{ascending:false});if(error)notify(error.message);else setLeads(data||[])}
 async function openActivity(l){setActivityLead(l);setActivityNote('');setActivityType('Note');setActivityLoading(true);const {data,error}=await supabase.from('crm_lead_activity').select('*').eq('lead_id',l.id).order('created_at',{ascending:false});if(error)notify(error.message);else setActivities(data||[]);setActivityLoading(false)}
 async function addActivity(e){e.preventDefault();if(!activityLead||!activityNote.trim())return;setActivitySaving(true);const r=await supabase.from('crm_lead_activity').insert({lead_id:activityLead.id,activity_type:activityType,note:activityNote.trim()}).select().single();if(r.error)notify(r.error.message);else{let followUpUpdated=false;if(activityFollowUp){const u=await supabase.from('crm_leads').update({next_follow_up:activityFollowUp,updated_at:new Date().toISOString()}).eq('id',activityLead.id).select().single();if(u.error)notify(u.error.message);else{setLeads(x=>x.map(a=>a.id===activityLead.id?u.data:a));setActivityLead(u.data);followUpUpdated=true}}setActivities(x=>[r.data,...x]);setActivityNote('');setActivityFollowUp('');notify(followUpUpdated?'Activity added · next follow-up scheduled':'Activity added')}setActivitySaving(false)}
 async function completeFollowUp(){
  if(!activityLead||completingFollowUp)return
  if(!followUpNextDate||!followUpNote.trim()){notify('Add the outcome, notes, and next follow-up date');return}
  setCompletingFollowUp(true)
  try{
   const note=`Follow-up completed via ${followUpMethod}. Outcome: ${followUpOutcome}. ${followUpNote.trim()} Next follow-up: ${followUpNextDate}.`
   const r=await supabase.from('crm_lead_activity').insert({lead_id:activityLead.id,activity_type:followUpMethod,note}).select().single()
   if(r.error){notify(r.error.message);return}
   const nextStage=followUpOutcome==='Interested'?'Interested':followUpOutcome==='Not interested'?'Lost':activityLead.status
   const u=await supabase.from('crm_leads').update({next_follow_up:followUpNextDate,status:nextStage,updated_at:new Date().toISOString()}).eq('id',activityLead.id).select().single()
   if(u.error){notify(u.error.message);return}
   setLeads(x=>x.map(l=>l.id===activityLead.id?u.data:l));setActivityLead(u.data);setActivities(x=>[r.data,...x]);if(nextStage!==activityLead.status){const sh=await supabase.from('crm_lead_activity').insert({lead_id:activityLead.id,activity_type:'Stage change',note:'Stage changed from '+activityLead.status+' to '+nextStage+' after follow-up outcome: '+followUpOutcome+'.'}).select().single();if(!sh.error)setActivities(x=>[sh.data,...x])}setFollowUpNote('');setFollowUpNextDate('')
   notify(`Follow-up saved · next follow-up ${followUpNextDate}${nextStage!==activityLead.status?' · stage moved to '+nextStage:''}`)
  }catch(error){notify(error instanceof Error?error.message:'Follow-up completion failed')}
  finally{setCompletingFollowUp(false)}
 }
 async function deleteActivity(a){if(!a?.id)return;if(!confirm('Delete this activity entry?'))return;const r=await supabase.from('crm_lead_activity').delete().eq('id',a.id);if(r.error){notify(r.error.message);return}setActivities(x=>x.filter(item=>item.id!==a.id));notify('Activity deleted')}
 async function contactAction(l,type){const targets={Email:l.email,Call:l.phone,Instagram:l.instagram,WhatsApp:l.phone,Website:l.website};const target=targets[type];if(!target){notify(`No ${type==='Call'?'phone':type.toLowerCase()} available for this lead`);return}const activityTypeValue=type==='Website'?'Note':type;const note=type==='Website'?'Opened website':`${type} contact action started`;const r=await supabase.from('crm_lead_activity').insert({lead_id:l.id,activity_type:activityTypeValue,note}).select().single();if(r.error){notify(r.error.message);return}setActivities(x=>activityLead?.id===l.id?[r.data,...x]:x);notify(`${type} activity recorded`);let url=target.trim();if(type==='Email')url=`mailto:${target.trim()}`;if(type==='Call')url=`tel:${target.trim()}`;if(type==='WhatsApp'){let n=target.replace(/\D/g,'');if(n.startsWith('0'))n='234'+n.slice(1);url=`https://wa.me/${n}`}if(type==='Instagram'){const handle=target.trim().replace(/^@/,'');url=handle.startsWith('http')?handle:`https://instagram.com/${handle}`}if(type==='Website'&&!/^https?:\/\//i.test(url))url=`https://${url}`;window.open(url,'_blank','noopener,noreferrer')}
 function activityLabel(type){return type==='Stage change'?'Stage update':type}
 function interpolateTemplate(template,l){
  const analysis=proposalAnalyses[l?.id]||(intelResult&&intelLead?.id===l?.id?intelResult:null)
  const vars={contact_name:l?.contact_name?.split(' ')[0]||'there',company_name:(l?.company||'your business').replace(/\s*[—-]\s*Website\s*$/i,''),opportunity_score:String(analysis?.score??'—'),recommended_service:analysis?.recommended_service||'Business Website',location:l?.location||'Lagos',website:l?.website||''}
  return template.replace(/{{\s*([a-z_]+)\s*}}/gi,(_,key)=>String(vars[key]??''))
}
function outreachTemplate(l,channel){
  const name=l?.contact_name?.split(' ')[0]||'there'
  const company=(l?.company||'your business').replace(/\s*[—-]\s*Website\s*$/i,'')
  const offering=/real estate|property|properties/i.test(`${l?.company||''} ${l?.niche||''}`)?'properties':'products'
  if(channel==='Email')return interpolateTemplate(`Hi {{contact_name}},\n\nI came across {{company_name}} and wanted to reach out. I’m a web developer based in Lagos, and I help businesses improve their online presence with modern, mobile-friendly websites and e-commerce solutions.\n\nI have a quick idea that could help {{company_name}} present its ${offering} more effectively online. If you’re open to it, I’d be happy to show you.\n\nBest,\nJohn\nKing JohnKay Fundz`,l)
  if(channel==='Instagram')return interpolateTemplate(`Hi {{contact_name}} 👋 I came across {{company_name}} and wanted to reach out. I build modern websites and e-commerce stores that help businesses present their products/services professionally online. I can share a quick idea for your brand if you’re interested. — JohnKay Fundz`,l)
  return interpolateTemplate(`Hi {{contact_name}}, I’m John from King JohnKay Fundz. I came across {{company_name}} and wanted to ask if you currently have a website or are considering improving your online presence. I can share a quick demo/idea for your business if useful.`,l)
 }
 function openOutreach(l){
  setOutreachLead(l);setOutreachChannel(l?.email?'Email':l?.instagram?'Instagram':'WhatsApp');setOutreachCopied(false)
  setOutreachMessage(outreachTemplate(l,l?.email?'Email':l?.instagram?'Instagram':'WhatsApp'))
 }
 async function copyOutreach(){
  if(!outreachMessage)return
  try{await navigator.clipboard.writeText(outreachMessage);setOutreachCopied(true);notify('Outreach message copied');setTimeout(()=>setOutreachCopied(false),1800)}
  catch{notify('Copy failed — select the message and copy it manually')}
 }
 async function sendOutreach(){
  if(!outreachLead||!outreachMessage.trim()||outreachSending)return
  if(outreachChannel==='Email'){
   if(!outreachLead.email){notify('This lead has no email address');return}
   setOutreachSending(true)
   try{
    const subject=`Quick idea for ${(outreachLead.company||'your business').replace(/\s*[—-]\s*Website\s*$/i,'')}`
    const r=await supabase.functions.invoke('send-gmail',{body:{lead_id:outreachLead.id,to:outreachLead.email,subject,text:outreachMessage.trim()}})
    if(r.error||!r.data?.success){notify(r.data?.error||r.error?.message||'Email sending failed');return}
    setLeads(x=>x.map(a=>a.id===outreachLead.id?r.data.lead:a))
    setOutreachLead(r.data.lead)
    if(activityLead?.id===outreachLead.id)setActivities(x=>[r.data.activity,...x])
    notify(`Email sent · follow-up set for ${r.data.follow_up}`)
   }catch(error){notify(error instanceof Error?error.message:'Email sending failed')}
   finally{setOutreachSending(false)}
   return
  }
  const type=outreachChannel==='WhatsApp'?'WhatsApp':outreachChannel
  const r=await supabase.from('crm_lead_activity').insert({lead_id:outreachLead.id,activity_type:type,note:`Outreach prepared/opened: ${outreachMessage.trim()}`}).select().single()
  if(r.error){notify(r.error.message);return}
  setActivities(x=>activityLead?.id===outreachLead.id?[r.data,...x]:x);const stageUpdate=outreachLead.status==='New Lead'||outreachLead.status==='Replied'?await supabase.from('crm_leads').update({status:'Contacted',updated_at:new Date().toISOString()}).eq('id',outreachLead.id).select().single():{data:outreachLead,error:null};if(!stageUpdate.error&&stageUpdate.data){setLeads(x=>x.map(a=>a.id===outreachLead.id?stageUpdate.data:a));setOutreachLead(stageUpdate.data);const sh=await supabase.from('crm_lead_activity').insert({lead_id:outreachLead.id,activity_type:'Stage change',note:'Stage changed from '+outreachLead.status+' to Contacted after '+outreachChannel+' outreach.'}).select().single();if(!sh.error)setActivities(x=>activityLead?.id===outreachLead.id?[sh.data,...x]:x)}notify(`${outreachChannel} outreach opened and recorded`)
  const target=outreachChannel==='Instagram'?outreachLead.instagram:outreachLead.phone
  if(!target)return
  let url=target.trim()
  if(outreachChannel==='WhatsApp'){let n=target.replace(/\D/g,'');if(n.startsWith('0'))n='234'+n.slice(1);url=`https://wa.me/${n}?text=${encodeURIComponent(outreachMessage.trim())}`}
  if(outreachChannel==='Instagram'){const handle=target.trim().replace(/^@/,'');url=handle.startsWith('http')?handle:`https://instagram.com/${handle}`}
  window.open(url,'_blank','noopener,noreferrer')
 }
 function notify(x){setToast(x);setTimeout(()=>setToast(''),3000)}
 async function auth(e){e.preventDefault();setAuthMsg('');const r=mode==='login'?await supabase.auth.signInWithPassword({email,password}):await supabase.auth.signUp({email,password});if(r.error)setAuthMsg(r.error.message);else if(mode==='signup')setAuthMsg('Account created. Check your email if confirmation is enabled.')}
 async function signout(){await supabase.auth.signOut();setLeads([])}
 async function syncHubSpot(){setSyncing(true);try{let {data:{session:currentSession}}=await supabase.auth.getSession();if(!currentSession?.access_token){const refreshed=await supabase.auth.refreshSession();currentSession=refreshed.data.session}if(!currentSession?.access_token){notify('Your login session is missing. Please sign in again.');return}const r=await supabase.functions.invoke('sync-hubspot',{body:{},headers:{Authorization:`Bearer ${currentSession.access_token}`}});if(r.error)notify(r.error.message||'HubSpot sync failed');else if(!r.data?.success)notify(r.data?.error||'HubSpot sync failed');else{await load();notify(`${r.data.synced} HubSpot deals synchronized`)}}catch(error){notify(error instanceof Error?error.message:'HubSpot sync failed')}finally{setSyncing(false)}}
 function buildIntelligenceReport(result, checks=intelChecks){
  if(!intelLead)return
  const rows=[['Mobile experience',checks.mobile],['Clear call-to-action',checks.cta],['Contact options',checks.contact],['E-commerce opportunity',checks.ecommerce],['Basic SEO readiness',checks.seo]]
  const assessment=assessIntelligence(checks,Boolean(intelLead.website||intelUrl.trim()))
  const score=result?.score ?? assessment.score
  const service=result?.recommended_service || assessment.recommendedService
  const value=result?.estimated_value ? money(result.estimated_value) : money(assessment.estimatedValue)
  const gaps=rows.filter(x=>!x[1]).map(x=>x[0])
  const hasWebsite=Boolean(intelLead.website||intelUrl.trim())
  const reportTitle=hasWebsite?'WEBSITE OPPORTUNITY REPORT':'NEW WEBSITE OPPORTUNITY REPORT'
  const opportunities=result?.opportunities?.length?result.opportunities.map(x=>'• '+x):hasWebsite?(gaps.length?gaps.map(x=>'• Improve '+x.toLowerCase()):['• Strengthen the existing website experience and conversion path']):['• Establish a professional online presence','• Make products/services easier to discover online','• Create a clear customer enquiry or ordering path']
  const report=[reportTitle,'','Business: '+(intelLead.company||'Prospect'),'Contact: '+(intelLead.contact_name||'Not provided'),'Industry: '+(intelLead.niche||'Business'),'Location: '+(intelLead.location||'Not provided'),'Website: '+(intelUrl||intelLead.website||'Not provided'),result?.title?'Page title: '+result.title:'',result?.response_ms?'Server response time: '+result.response_ms+' ms':'','', 'OPPORTUNITY SCORE: '+score+'/5','','CHECKLIST',...rows.map(x=>(x[1]?'✓':'○')+' '+x[0]),'','KEY FINDINGS',...(result?.findings||[]).map(x=>'• '+x),(hasWebsite?'':'• No existing website was provided; this assessment is for a new website opportunity.'),'','KEY OPPORTUNITIES',...opportunities,'','RECOMMENDED SERVICE: '+service,'ESTIMATED PROJECT VALUE: '+value,'','Prepared by JohnKay Fundz'].filter(Boolean).join('\\n')
  setIntelReport(report)
 }
 function generateIntelligence(){buildIntelligenceReport(null)}
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
   setIntelChecks(nextChecks);setIntelResult(r.data);setProposalAnalyses(x=>({...x,[intelLead.id]:r.data}));buildIntelligenceReport(r.data,nextChecks);const historyNote='Website opportunity report saved. Score: '+r.data.score+'/5. Recommended service: '+r.data.recommended_service+'. Estimated value: '+money(r.data.estimated_value)+'. '+cleanText((r.data.opportunities||[]).join(' '),1500);const h=await supabase.from('crm_lead_activity').insert({lead_id:intelLead.id,activity_type:'Note',note:historyNote}).select().single();if(h.error)notify('Analysis complete, but history save failed: '+h.error.message);notify('Website analyzed successfully · report saved to lead history')
  }catch(error){notify(error instanceof Error?error.message:'Website analysis failed')}
  finally{setIntelAnalyzing(false)}
 }
 async function copyIntelligence(){if(!intelReport)return;try{await navigator.clipboard.writeText(intelReport);setIntelCopied(true);notify('Opportunity report copied');setTimeout(()=>setIntelCopied(false),1800)}catch{notify('Copy failed — select the report and copy it manually')}}
 function proposalDefaults(l){
  const analysis=proposalAnalyses[l?.id]||(intelResult&&intelLead?.id===l?.id?intelResult:null)
  const service=analysis?.recommended_service||(/real estate|property|properties/i.test(`${l?.company||''} ${l?.niche||''}`)?'Business Website':'Business Website')
  const price=analysis?.estimated_value||({ 'E-commerce Website':250000,'Website Redesign':120000,'Custom Web Application':350000,'React/MERN Development':200000 }[service]||150000)
  const timeline=service==='E-commerce Website'?'10–14 business days':service==='Custom Web Application'?'14–21 business days':'7–10 business days'
  return {service,price:String(price),timeline}
 }
 function buildProposal(l=proposalLead,service=proposalService,price=proposalPrice,timeline=proposalTimeline){
  if(!l)return
  const validated=proposalSchema.safeParse({service,investment:price,timeline,taxRate:proposalTaxRate});if(!validated.success){notify(validated.error.issues[0]?.message||'Check proposal values');return}
  const investment=Number(price||0),taxRate=Number(proposalTaxRate||0),tax=investment*taxRate/100,total=investment+tax
  const milestones=[{label:'Project start',percent:50,amount:investment*.5},{label:'Final delivery',percent:50,amount:investment*.5}]
  const company=(l.company||'your business').replace(/\s*[—-]\s*Website\s*$/i,'')
  const analysis=proposalAnalyses[l?.id]||(intelResult&&intelLead?.id===l.id?intelResult:null)
  const findings=analysis?.findings||[]
  const opportunities=analysis?.opportunities||[]
  const deliverables=service==='E-commerce Website'?['Responsive product-focused storefront','Product/category pages and clear calls to action','Mobile-first shopping experience','Contact/order flow and conversion improvements','Basic SEO-ready page structure']:service==='Website Redesign'?['Modern responsive redesign','Improved navigation and conversion flow','Mobile experience improvements','Clear contact and call-to-action sections','Basic SEO-ready page structure']:service==='Custom Web Application'?['Responsive application interface','Core workflow and dashboard screens','Frontend integration and validation','Deployment-ready production build','Handover and basic usage guidance']:['Modern responsive business website','Professional homepage and service/product sections','Mobile-first layout and clear calls to action','Contact/inquiry integration','Basic SEO-ready page structure']
  const lines=['WEBSITE PROJECT PROPOSAL','','Prepared for: '+company,'Contact: '+(l.contact_name||'Not provided'),'Prepared by: John Kalumba — JohnKay Fundz','','PROJECT OVERVIEW',`I propose building or improving ${company}'s online presence with ${/^[aeiou]/i.test(service) ? 'an' : 'a'} ${service.toLowerCase()} focused on a professional mobile experience, clear customer journeys, and stronger conversion opportunities.`, '', 'RECOMMENDED SOLUTION',service,'', 'KEY OPPORTUNITIES',...(opportunities.length?opportunities.map(x=>'• '+x):['• Improve the website experience and conversion path']),...(findings.length?['','ANALYSIS FINDINGS',...findings.map(x=>'• '+x)]:[]),'','DELIVERABLES',...deliverables.map(x=>'• '+x),'','TIMELINE',timeline,'','INVESTMENT',money(investment),'','TAX ('+taxRate+'%)',money(tax),'','TOTAL CLIENT INVESTMENT',money(total),'','MILESTONE PAYMENTS',...milestones.map(m=>m.percent+'% · '+m.label+' · '+money(m.amount)),'','NEXT STEPS','1. Confirm the scope and required content.','2. Provide the business information, images and other assets needed for the build.','3. Approve the project start and payment arrangement.','4. Development, review and final delivery.','','Thank you for considering JohnKay Fundz. I’d be happy to discuss the project and tailor the scope to your exact needs.','','John Kalumba','JohnKay Fundz'].join('\\n')
  setProposalText(lines)
 }
 function downloadProposalMarkdown(){
 if(!proposalText)return
 const blob=new Blob([proposalText],{type:'text/markdown;charset=utf-8'})
 const url=URL.createObjectURL(blob),a=document.createElement('a')
 a.href=url;a.download=(proposalLead?.company||'johnkay-proposal').replace(/[^a-z0-9]+/gi,'-').toLowerCase()+'.md'
 document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);notify('Markdown proposal downloaded')
}
async function printProposal(){if(!proposalText)return;setProposalPdfBusy(true);try{const win=window.open('','_blank','noopener,noreferrer');if(!win){notify('Allow pop-ups to export the proposal');return}const html=proposalText.split('\n').map(line=>line?'<p>'+line.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</p>':'<br/>').join('');win.document.write('<!doctype html><html><head><title>JohnKay Fundz Proposal</title><style>body{font-family:Inter,Arial,sans-serif;max-width:760px;margin:40px auto;padding:0 24px;color:#111;line-height:1.55}p{white-space:pre-wrap}@media print{body{margin:0 auto}}</style></head><body>'+html+'</body></html>');win.document.close();win.focus();setTimeout(()=>win.print(),250);notify('Proposal ready — choose Save as PDF in the print dialog')}finally{setProposalPdfBusy(false)}}
function generateProposal(){buildProposal()}
 async function copyProposal(){if(!proposalText)return;try{await navigator.clipboard.writeText(proposalText);setProposalCopied(true);notify('Proposal copied');setTimeout(()=>setProposalCopied(false),1800)}catch{notify('Copy failed — select the proposal and copy it manually')}}
 async function markProposalSent(){
  if(!proposalLead||!proposalText||proposalTracking)return
  setProposalTracking(true)
  try{
   const followUp=new Date();followUp.setDate(followUp.getDate()+3);const followUpDate=`${followUp.getFullYear()}-${String(followUp.getMonth()+1).padStart(2,'0')}-${String(followUp.getDate()).padStart(2,'0')}`
   const value=Number(proposalPrice||0)
   const u=await supabase.from('crm_leads').update({status:'Proposal Sent',deal_value:value,next_follow_up:followUpDate,updated_at:new Date().toISOString()}).eq('id',proposalLead.id).select().single()
   if(u.error){notify(u.error.message);return}
   const a=await supabase.from('crm_lead_activity').insert({lead_id:proposalLead.id,activity_type:'Proposal Sent',note:`Proposal prepared and marked as sent. Service: ${proposalService}. Investment: ${money(value)}. Follow-up scheduled for ${followUpDate}.`}).select().single()
   if(a.error){notify(a.error.message);return}
   setLeads(x=>x.map(l=>l.id===u.data.id?u.data:l));setProposalLead(u.data)
   if(activityLead?.id===u.data.id)setActivities(x=>[a.data,...x])
   notify(`Proposal marked sent · ${money(value)} · follow-up ${followUpDate}`)
  }catch(error){notify(error instanceof Error?error.message:'Proposal tracking failed')}
  finally{setProposalTracking(false)}
 }
 const filtered=useMemo(()=>{const q=query.toLowerCase().trim();return leads.filter(l=>(!q||[l.company,l.contact_name,l.email,l.niche,l.location,l.source].some(v=>String(v||'').toLowerCase().includes(q)))&&(status==='All'||l.status===status)&&(source==='All'||l.source===source))},[leads,query,status,source])
 const sorted=useMemo(()=>[...filtered].sort((a,b)=>{const av=String(a?.[sortKey]??'').toLowerCase(),bv=String(b?.[sortKey]??'').toLowerCase();const an=Number(a?.[sortKey]??0),bn=Number(b?.[sortKey]??0);const cmp=sortKey==='deal_value'?an-bn:av.localeCompare(bv);return sortDir==='asc'?cmp:-cmp}),[filtered,sortKey,sortDir])
 const pageCount=Math.max(1,Math.ceil(sorted.length/pageSize));const safePage=Math.min(page,pageCount);const paged=sorted.slice((safePage-1)*pageSize,safePage*pageSize)
 function sortBy(key){setPage(1);if(sortKey===key)setSortDir(x=>x==='asc'?'desc':'asc');else{setSortKey(key);setSortDir('asc')}}
 useEffect(()=>{setPage(1)},[query,status,source])
 const metrics=useMemo(()=>({total:leads.length,active:leads.filter(l=>!['Won','Lost'].includes(l.status)).length,pipeline:leads.filter(l=>!['Won','Lost'].includes(l.status)).reduce((s,l)=>s+Number(l.deal_value||0),0),won:leads.filter(l=>l.status==='Won').reduce((s,l)=>s+Number(l.deal_value||0),0),due:leads.filter(l=>l.next_follow_up&&l.next_follow_up<=today()&&!['Won','Lost'].includes(l.status)).length}),[leads])
 const sources=[...new Set(leads.map(l=>l.source).filter(Boolean))]
 const followUps=useMemo(()=>{const active=leads.filter(l=>l.next_follow_up&&!['Won','Lost'].includes(l.status));const t=today();return {overdue:active.filter(l=>l.next_follow_up<t),today:active.filter(l=>l.next_follow_up===t),upcoming:active.filter(l=>l.next_follow_up>t).sort((a,b)=>a.next_follow_up.localeCompare(b.next_follow_up)).slice(0,5)}},[leads])
 function edit(l){setForm({...l,deal_value:l.deal_value||''});setModal(true)}
 async function save(e){
 e.preventDefault();setSaving(true)
 const candidate={...form,company:cleanText(form.company,120),contact_name:cleanText(form.contact_name,100),role:cleanText(form.role,100),email:cleanText(form.email,160),phone:cleanText(form.phone,30),website:cleanText(form.website,240),instagram:cleanText(form.instagram,120),niche:cleanText(form.niche,100),location:cleanText(form.location,100),source:cleanText(form.source,60),notes:cleanText(form.notes,2000),deal_value:form.deal_value?Number(form.deal_value):0,updated_at:new Date().toISOString()}
 const parsed=leadSchema.safeParse(candidate)
 if(!parsed.success){notify(parsed.error.issues[0]?.message||'Please check the lead details');setSaving(false);return}
 const p={...parsed.data};delete p.id;delete p.owner_id;delete p.created_at
 const r=form.id?await supabase.from('crm_leads').update(p).eq('id',form.id).select().single():await supabase.from('crm_leads').insert(p).select().single()
 if(r.error)notify(r.error.message);else{setLeads(x=>form.id?x.map(a=>a.id===r.data.id?r.data:a):[r.data,...x]);setModal(false);notify(form.id?'Lead updated':'Lead added')}
 setSaving(false)
}
 async function remove(id){if(!confirm('Delete this lead?'))return;const r=await supabase.from('crm_leads').delete().eq('id',id);if(r.error)notify(r.error.message);else{setLeads(x=>x.filter(a=>a.id!==id));notify('Lead deleted')}}
 async function move(l,s){if(s===l.status)return;const r=await supabase.from('crm_leads').update({status:s,updated_at:new Date().toISOString()}).eq('id',l.id).select().single();if(r.error)notify(r.error.message);else{setLeads(x=>x.map(a=>a.id===l.id?r.data:a));const h=await supabase.from('crm_lead_activity').insert({lead_id:l.id,activity_type:'Stage change',note:'Stage changed from '+l.status+' to '+s+'.'}).select().single();if(h.error)notify('Stage updated, but history logging failed');else if(activityLead?.id===l.id)setActivities(x=>[h.data,...x]);notify('Stage moved to '+s)}}
 if(loading)return <div className="center"><div className="loader"/>Loading Client Engine…</div>
 if(!supabase)return <div className="center"><div className="auth"><b className="logo">JK</b><h1>Client Engine</h1><p>Add the Supabase environment variables to run the app.</p></div></div>
 if(!session)return <div className="center auth-bg"><form className="auth" onSubmit={auth}><b className="logo">JK</b><small>PRIVATE BUSINESS TOOL</small><h1>JohnKay Client Engine</h1><p>One private workspace for leads, follow-ups and deal tracking.</p><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength="6"/></label>{authMsg&&<em>{authMsg}</em>}<button className="primary wide">{mode==='login'?'Sign in':'Create account'}</button><button type="button" className="link" onClick={()=>setMode(mode==='login'?'signup':'login')}>{mode==='login'?'Create a new account':'Back to sign in'}</button></form></div>
 return <div className="shell"><aside><div className="brand"><b className="logo">JK</b><span><strong>JohnKay</strong><small>Client Engine</small></span></div><nav><button className="active"><BarChart3/>Overview</button><button onClick={()=>document.getElementById('leads').scrollIntoView({behavior:'smooth'})}><Users/>Leads</button><button onClick={()=>{setForm({...empty});setModal(true)}}><Plus/>Add Lead</button><button onClick={()=>{const l=leads[0];if(l)openOutreach(l)}}><ExternalLink/>Outreach</button><button onClick={()=>document.getElementById("intelligence").scrollIntoView({behavior:"smooth"})}><Target/>Intelligence</button></nav><div className="asideBottom"><div className="tip"><Target/>Turn prospects into paying clients.</div><button onClick={signout}><LogOut/>Sign out</button></div></aside>
 <main><header><div><small>PRIVATE WORKSPACE</small><h1>Client acquisition, in one place.</h1><p>Track prospects, follow-ups and potential revenue without rebuilding your workflow every time.</p></div><div className="headerActions"><button className="secondary" onClick={syncHubSpot} disabled={syncing}><RefreshCw className={syncing?"spin":""}/>{syncing?"Syncing…":"Sync HubSpot"}</button><button className="primary" onClick={()=>{setForm({...empty});setModal(true)}}><Plus/>Add lead</button></div></header>
 <LeadIntelligence leads={leads} intelLead={intelLead} setIntelLead={setIntelLead} intelUrl={intelUrl} setIntelUrl={setIntelUrl} setIntelReport={setIntelReport} setIntelResult={setIntelResult} setIntelChecks={setIntelChecks} intelChecks={intelChecks} saveLeadWebsite={saveLeadWebsite} analyzeWebsite={analyzeWebsite} intelAnalyzing={intelAnalyzing} generateIntelligence={generateIntelligence} intelResult={intelResult} intelReport={intelReport} copyIntelligence={copyIntelligence} intelCopied={intelCopied}/><ProposalGenerator money={money} proposalAnalyses={proposalAnalyses} intelResult={intelResult} intelLead={intelLead} leads={leads} proposalLead={proposalLead} setProposalLead={setProposalLead} setProposalText={setProposalText} setProposalCopied={setProposalCopied} proposalDefaults={proposalDefaults} proposalService={proposalService} setProposalService={setProposalService} proposalPrice={proposalPrice} setProposalPrice={setProposalPrice} proposalTaxRate={proposalTaxRate} setProposalTaxRate={setProposalTaxRate} proposalTimeline={proposalTimeline} setProposalTimeline={setProposalTimeline} proposalText={proposalText} generateProposal={generateProposal} proposalTracking={proposalTracking} markProposalSent={markProposalSent} copyProposal={copyProposal} proposalCopied={proposalCopied} downloadProposalMarkdown={downloadProposalMarkdown} printProposal={printProposal} proposalPdfBusy={proposalPdfBusy}/><OutreachEngine leads={leads} outreachLead={outreachLead} openOutreach={openOutreach} outreachChannel={outreachChannel} setOutreachChannel={setOutreachChannel} outreachTemplate={outreachTemplate} setOutreachMessage={setOutreachMessage} outreachMessage={outreachMessage} copyOutreach={copyOutreach} outreachCopied={outreachCopied} sendOutreach={sendOutreach} outreachSending={outreachSending}/><DashboardSummary metrics={metrics} followUps={followUps} openActivity={openActivity} money={money}/><LeadPipeline filtered={filtered} sorted={sorted} paged={paged} safePage={safePage} page={page} pageCount={pageCount} pageSize={pageSize} query={query} setQuery={setQuery} status={status} setStatus={setStatus} source={source} setSource={setSource} sources={sources} stages={stages} tone={tone} sortBy={sortBy} move={move} today={today} money={money} contactAction={contactAction} openActivity={openActivity} edit={edit} remove={remove} setForm={setForm} setModal={setModal} empty={empty}/></main>
 <LeadModals modal={modal} setModal={setModal} form={form} setForm={setForm} save={save} saving={saving} stages={stages} activityLead={activityLead} setActivityLead={setActivityLead} followUpMethod={followUpMethod} setFollowUpMethod={setFollowUpMethod} followUpOutcome={followUpOutcome} setFollowUpOutcome={setFollowUpOutcome} followUpNextDate={followUpNextDate} setFollowUpNextDate={setFollowUpNextDate} followUpNote={followUpNote} setFollowUpNote={setFollowUpNote} today={today} completeFollowUp={completeFollowUp} completingFollowUp={completingFollowUp} activityType={activityType} setActivityType={setActivityType} activityNote={activityNote} setActivityNote={setActivityNote} activityFollowUp={activityFollowUp} setActivityFollowUp={setActivityFollowUp} addActivity={addActivity} activitySaving={activitySaving} activityLoading={activityLoading} activities={activities} activityLabel={activityLabel} deleteActivity={deleteActivity}/>{toast&&<div className="toast"><Check/>{toast}</div>}</div>
}
