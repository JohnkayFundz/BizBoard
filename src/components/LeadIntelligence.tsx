import { useState } from 'react'
import { Target, Globe2, PlusCircle, Search, ExternalLink, Mail, Phone, Instagram, Save, Send } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { assessIntelligence, EMPTY_INTELLIGENCE_CHECKS } from '../utils/intelligence'
import type { IntelligenceChecks } from '../types/crm'
import type { IntelligenceReport } from '../types/intelligence'
import { env } from '../lib/env'

type Lead={id:string|number;company?:string|null;contact_name?:string|null;email?:string|null;phone?:string|null;instagram?:string|null;website?:string|null;niche?:string|null;location?:string|null;status?:string|null}
type Analysis={score?:number;recommended_service?:string;estimated_value?:number;response_ms?:number}
type WebsiteCandidate={url:string;domain:string;status:number|null;title:string;confidence:'verified'|'likely'|'unverified';score:number;reason:string;source_type?:'official_website'|'social_profile'|'directory'|'marketplace'|'portfolio'|'news_media'|'unknown'}
type ContactIntel={emails:string[];phones:string[];instagram:string[];social_profiles:string[];addresses?:string[];sources:Array<{url:string;domain:string;source_type:string;label?:string;confidence:string;score:number;title:string}>}
const supabase=env?createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_PUBLISHABLE_KEY):null

interface Props{
 leads:Lead[]; intelLead:Lead|null; setIntelLead:(lead:Lead|null)=>void; intelUrl:string; setIntelUrl:(value:string)=>void
 setIntelReport:(value:string)=>void; setIntelResult:(value:Analysis|null)=>void; setIntelChecks:(value:IntelligenceChecks|((current:IntelligenceChecks)=>IntelligenceChecks))=>void
 intelChecks:IntelligenceChecks; saveLeadWebsite:()=>void; analyzeWebsite:()=>void; intelAnalyzing:boolean; intelGenerating:boolean; generateIntelligence:()=>void
 intelResult:Analysis|null; intelReport:string; copyIntelligence:()=>void; intelCopied:boolean
 intelligenceHistory:IntelligenceReport[]; applyIntelligenceReport:(report:IntelligenceReport)=>void; onGenerateProposalFromOpportunity:(report:IntelligenceReport)=>void
 onLeadUpdated:(lead:Lead)=>void
 onUseContactIntel:(lead:Lead,contacts:ContactIntel)=>void
}

export function LeadIntelligence({leads,intelLead,setIntelLead,intelUrl,setIntelUrl,setIntelReport,setIntelResult,setIntelChecks,intelChecks,saveLeadWebsite,analyzeWebsite,intelAnalyzing,intelGenerating,generateIntelligence,intelResult,intelReport,copyIntelligence,intelCopied,intelligenceHistory,applyIntelligenceReport,onGenerateProposalFromOpportunity,onLeadUpdated,onUseContactIntel}:Props){
 const [websiteCandidates,setWebsiteCandidates]=useState<WebsiteCandidate[]>([])
 const [otherOnlinePresence,setOtherOnlinePresence]=useState<WebsiteCandidate[]>([])
 const [contactIntel,setContactIntel]=useState<ContactIntel|null>(null)
 const [resolvingWebsite,setResolvingWebsite]=useState(false)
 const [savingContacts,setSavingContacts]=useState(false)
 const [resolverMessage,setResolverMessage]=useState('')
 const [resolverDiagnostics,setResolverDiagnostics]=useState<{searched:number;discovered:number}|null>(null)
 const hasWebsite=Boolean(intelLead?.website||intelUrl.trim())
 const assessment=assessIntelligence(intelChecks,hasWebsite)
 const setWebsite=(value:string)=>setIntelUrl(value)
 const findWebsite=async()=>{
  if(!intelLead) return
  setResolvingWebsite(true)
  setResolverMessage('')
  setResolverDiagnostics(null)
  setWebsiteCandidates([])
  setOtherOnlinePresence([])
  setContactIntel(null)
  try{
   if(!supabase){setResolverMessage('Supabase environment is not configured.');return}
   const {data,error}=await supabase.functions.invoke('resolve-website',{body:{business_name:intelLead.company||'',contact_name:intelLead.contact_name||'',location:intelLead.location||'',email:intelLead.email||''}})
   if(error) throw error
   const candidates=Array.isArray(data?.candidates)?data.candidates as WebsiteCandidate[]:[]
   const presence=Array.isArray(data?.other_online_presence)?data.other_online_presence as WebsiteCandidate[]:[]
   setWebsiteCandidates(candidates)
   setOtherOnlinePresence(presence)
   if(data?.contact_intelligence) setContactIntel(data.contact_intelligence as ContactIntel)
   if(typeof data?.searched==='number'&&typeof data?.discovered==='number') setResolverDiagnostics({searched:data.searched,discovered:data.discovered})
   setResolverMessage(data?.message|| (candidates.length?'Official website candidates found. Review the match before saving.':presence.length?'No official website was verified. Other online presence was found and classified separately.':'No live candidate website was found. You can search manually using the business name and location.'))
  }catch(error){
   setResolverMessage(error instanceof Error?error.message:'Unable to find a website right now.')
  }finally{setResolvingWebsite(false)}
 }
 const saveContactIntel=async()=>{
  if(!intelLead||!contactIntel||!supabase)return
  const next={
   email:intelLead.email||contactIntel.emails[0]||null,
   phone:intelLead.phone||contactIntel.phones[0]||null,
   instagram:intelLead.instagram||contactIntel.instagram[0]||null,
  }
  if(next.email===intelLead.email&&next.phone===intelLead.phone&&next.instagram===intelLead.instagram){setResolverMessage('No new contact details to save.');return}
  setSavingContacts(true)
  try{
   const {data,error}=await supabase.from('crm_leads').update({...next,updated_at:new Date().toISOString()}).eq('id',intelLead.id).select().single()
   if(error) throw error
   onLeadUpdated(data)
   setResolverMessage('Contact details saved to this lead.')
  }catch(error){
   setResolverMessage(error instanceof Error?error.message:'Unable to save contact details.')
  }finally{setSavingContacts(false)}
 }
 const selectLead=(value:string)=>{
  const l=leads.find(x=>String(x.id)===value)
  setIntelLead(l||null);setIntelUrl(l?.website||'');setIntelReport('');setIntelResult(null);setIntelChecks({...EMPTY_INTELLIGENCE_CHECKS});setWebsiteCandidates([]);setOtherOnlinePresence([]);setContactIntel(null);setResolverMessage('');setResolverDiagnostics(null)
 }
 return (<section className="panel intelligencePanel" id="intelligence">
  <div className="panelHead"><div><h2>Lead Intelligence</h2><p>Turn a prospect into a clear sales opportunity before you reach out.</p></div><span>{hasWebsite?'Opportunity scanner':'New website opportunity'}</span></div>
  <div className="intelligenceGrid"><div className="intelForm">
   <label className="field"><span className="fieldLabel">Choose a lead</span><select value={intelLead?.id||''} onChange={e=>selectLead(e.target.value)}><option value="">Select a prospect…</option>{leads.filter(l=>!['Won','Lost'].includes(l.status||'')).map(l=><option key={l.id} value={l.id}>{l.company} · {l.contact_name||'No contact'}</option>)}</select></label>
   <label className="field"><span className="fieldLabel">Website URL</span><input value={intelUrl} onChange={e=>setWebsite(e.target.value)} placeholder="https://example.com" inputMode="url"/>{intelLead&&!intelLead.website&&<small className="intelHint"><Globe2/> No website is saved for this lead. You can search likely business domains below.</small>}</label>
   {intelLead&&<div className="intelButtons"><button type="button" className="secondary" onClick={findWebsite} disabled={resolvingWebsite}>{resolvingWebsite?'Searching…':<><Search/>Find website & contacts</>}</button></div>}
   {resolverMessage&&<div className="intelHint" style={{marginTop:8}}><Globe2/>{resolverMessage}{resolverDiagnostics&&<small style={{display:'block',marginTop:4}}>Diagnostic: {resolverDiagnostics.discovered} web results discovered · {resolverDiagnostics.searched} direct domains checked.</small>}</div>}
   {websiteCandidates.length>0&&<div className="intelLeadSummary" style={{display:'grid',gap:8,marginTop:10}}><strong>Official website candidates</strong>{websiteCandidates.map(candidate=><div key={candidate.url} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><div style={{minWidth:0}}><span style={{display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{candidate.domain}</span><small style={{display:'block',marginTop:3}}>{candidate.confidence} · {candidate.reason}</small></div><div style={{display:'flex',gap:6}}><button type="button" className="secondary" onClick={()=>setWebsite(candidate.url)}>Use</button><button type="button" className="secondary" title="Open candidate" onClick={()=>window.open(candidate.url,'_blank','noopener,noreferrer')}><ExternalLink/></button></div></div>)}</div>}
   {otherOnlinePresence.length>0&&<div className="intelLeadSummary" style={{display:'grid',gap:8,marginTop:10}}><strong>Other online presence</strong><small>These results are not treated as the business's official website.</small>{otherOnlinePresence.map(candidate=><div key={candidate.url} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><div style={{minWidth:0}}><span style={{display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{candidate.domain}</span><small style={{display:'block',marginTop:3}}>{candidate.source_type?.replace('_',' ')} · {candidate.reason}</small></div><button type="button" className="secondary" title="Open result" onClick={()=>window.open(candidate.url,'_blank','noopener,noreferrer')}><ExternalLink/></button></div>)}</div>}
   {contactIntel && (
    <div className="intelLeadSummary" style={{display:'grid',gap:10,marginTop:10}}>
     <div>
      <strong>Contact Intelligence</strong>
      <small style={{display:'block',marginTop:3}}>Public contact channels discovered from websites, directories and social profiles. Review before using.</small>
     </div>
     <div style={{display:'grid',gap:7}}>
      {contactIntel.emails.map(email=><div key={email} style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}><Mail/><a href={'mailto:'+email}>{email}</a></div>)}
      {contactIntel.phones.map(phone=><div key={phone} style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}><Phone/><a href={'tel:'+phone}>{phone}</a></div>)}
       {contactIntel.instagram.map(url=><div key={url} style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}><Instagram/><a href={url} target="_blank" rel="noreferrer">{url.replace(/^https?:\/\/(?:www\.)?instagram\.com\//i,'@')}</a></div>)}
      {(contactIntel.addresses||[]).map(address=><div key={address} style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}><Globe2/><span>{address}</span></div>)}
      {!contactIntel.emails.length&&!contactIntel.phones.length&&!contactIntel.instagram.length&&!(contactIntel.addresses||[]).length&&<small>No public contact channels found across web listings. Add contact details manually.</small>}
     </div>
     {(contactIntel.emails.length||contactIntel.phones.length||contactIntel.instagram.length) && (
      <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
       <button type="button" className="primary" onClick={()=>onUseContactIntel(intelLead,contactIntel)}><Send/>Use for Outreach</button>
       <button type="button" className="secondary" onClick={saveContactIntel} disabled={savingContacts}><Save/>{savingContacts?'Saving…':'Save contact details'}</button>
       <small>{intelLead?.email||intelLead?.phone||intelLead?.instagram?'Existing lead details will be kept.':'Use for Outreach can pass the discovered contact directly into the outreach composer.'}</small>
      </div>
     )}
     {contactIntel.sources.length>0 && (
      <div style={{display:'grid',gap:4}}>
       <small>Sources checked:</small>
       {contactIntel.sources.slice(0,6).map(source=>(
        <small key={source.url}><span>{source.label||source.source_type}</span> · <a href={source.url} target="_blank" rel="noreferrer">{source.domain}</a>{source.title?' · '+source.title:''}</small>
       ))}
      </div>
     )}
    </div>
   )}
   {intelLead&&<div className="intelLeadSummary"><strong>{intelLead.company}</strong><span>{intelLead.niche||'Business prospect'}{intelLead.location?' · '+intelLead.location:''}</span></div>}
   <div className="intelScoreCard">{hasWebsite?<><div><small>OPPORTUNITY SCORE</small><strong>{assessment.score}/5</strong></div><div><small>RECOMMENDED SERVICE</small><strong>{assessment.recommendedService}</strong></div></>:<><div><small>OPPORTUNITY AREAS</small><strong>5/5</strong></div><div><small>OPPORTUNITY TYPE</small><strong>New website</strong></div></>}<div><small>ESTIMATED VALUE</small><strong>₦{assessment.estimatedValue.toLocaleString('en-NG')}</strong></div></div>
   {hasWebsite ? <div className="intelChecks"><strong>Website audit checklist</strong>{[['mobile','Mobile-first experience'],['cta','Clear call-to-action'],['contact','Contact / WhatsApp options'],['ecommerce','E-commerce capability'],['seo','Basic SEO setup']].map(([k,label])=><label className="checkRow" key={k}><input type="checkbox" checked={Boolean(intelChecks[k as keyof IntelligenceChecks])} onChange={e=>setIntelChecks(x=>({...x,[k]:e.target.checked}))}/><span>{label}</span></label>)}</div> : <div className="intelChecks"><strong>Potential website capabilities</strong>{['Mobile-first experience','Clear call-to-action','Contact / WhatsApp options','E-commerce capability','Basic SEO setup'].map(label=><div className="checkRow" key={label}><span className="checkMark">✓</span><span>{label}</span></div>)}</div>}
   {intelLead&&<div className="intelLeadSummary"><strong>Opportunity snapshot</strong><span>{intelLead.company||'Prospect'} · {intelLead.niche||'Business prospect'}{intelLead.location?' · '+intelLead.location:''}</span><small>{hasWebsite?'Existing website detected — use the audit score to identify improvements.':'No verified website is saved — treat this as a new website sales opportunity, not an audit.'}</small></div>}
   <div className="intelLeadSummary"><strong>Recommended next action</strong><span>{hasWebsite?'Review the audit findings, then generate a proposal or start outreach.':'Confirm the business needs, offer a quick demo, and generate a proposal for the new website.'}</span></div>
   <div className="intelButtons">{intelLead&&!intelLead.website&&<button type="button" className="secondary" onClick={saveLeadWebsite} disabled={!intelUrl.trim()||intelUrl.trim()===intelLead.website}>Save to lead</button>}<button type="button" className="primary" onClick={analyzeWebsite} disabled={!intelLead||!intelUrl.trim()||intelAnalyzing}><Target/>{intelAnalyzing?'Analyzing…':'Analyze Website'}</button><button type="button" className="secondary" onClick={generateIntelligence} disabled={!intelLead||intelGenerating}><PlusCircle/>{intelGenerating?'Generating…':intelResult?'Refresh Report':'Create Opportunity Report'}</button></div>
   {!hasWebsite&&intelLead&&<div className="intelNoWebsite"><strong>No website available</strong><span>No verified website was found, so this lead is treated as a <strong>new-website opportunity</strong>. The checklist below describes what the new site can provide; it is not an audit of an existing website.</span></div>}
  </div><div className="intelReport"><div className="reportHead"><div><small>SALES INTELLIGENCE</small><strong>{hasWebsite?'Website Opportunity Report':'New Website Opportunity'}</strong>{intelResult&&<span className="analysisMeta">Automated analysis · {intelResult.response_ms||0} ms response</span>}</div><div className="intelButtons"><button type="button" className="secondary" onClick={copyIntelligence} disabled={!intelReport}>{intelCopied?'Copied':'Copy report'}</button>{intelReport&&intelligenceHistory[0]&&intelligenceHistory[0].leadId===Number(intelLead?.id)&&<button type="button" className="primary" onClick={()=>onGenerateProposalFromOpportunity(intelligenceHistory[0])}><Target/> Generate Proposal</button>}</div></div>{intelGenerating?<div className="intelLoading" aria-live="polite"><div className="loadingSkeleton"><span className="skeletonBlock wide"/><span className="skeletonBlock"/><span className="skeletonBlock"/><span className="skeletonBlock short"/></div><strong>Preparing sales intelligence…</strong><span>Structuring the opportunity, value proposition and discovery questions.</span></div>:intelReport?<pre>{intelReport}</pre>:<div className="intelEmpty"><Target/><strong>Your report will appear here</strong><span>{hasWebsite?'Analyze the website or create a checklist report.':'Create a new-website opportunity report from the prospect profile and recommended capabilities.'}</span></div>}
   {intelLead&&<div className="intelHistory"><div className="reportHead"><div><small>HISTORY</small><strong>Saved intelligence reports</strong></div><span>{intelligenceHistory.length}</span></div>{intelligenceHistory.length?intelligenceHistory.map(report=><div className="intelHistoryRow" key={report.id}><div><strong>{report.reportType==='new_website'?'New website opportunity':'Website audit'} · {report.score}/5</strong><small>{new Date(report.createdAt).toLocaleString('en-NG')} · {report.recommendedService} · ₦{report.estimatedValue.toLocaleString('en-NG')}</small></div><div className="intelHistoryActions"><button type="button" className="secondary" onClick={()=>applyIntelligenceReport(report)}>Load</button><button type="button" className="primary" onClick={()=>onGenerateProposalFromOpportunity(report)}>Generate Proposal</button></div></div>):<div className="intelEmpty compact"><span>No saved intelligence reports for this lead yet.</span></div>}</div>}</div></div>
 </section>)
}// Deployment trigger: keep production aligned with the current main branch.\n
