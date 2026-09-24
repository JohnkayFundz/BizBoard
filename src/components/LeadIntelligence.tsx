import { Target, Globe2, PlusCircle } from 'lucide-react'
import { assessIntelligence, EMPTY_INTELLIGENCE_CHECKS } from '../utils/intelligence'
import type { IntelligenceChecks } from '../types/crm'
import type { IntelligenceReport } from '../types/intelligence'

type Lead={id:string|number;company?:string|null;contact_name?:string|null;website?:string|null;niche?:string|null;location?:string|null;status?:string|null}
type Analysis={score?:number;recommended_service?:string;estimated_value?:number;response_ms?:number}
interface Props{
 leads:Lead[]; intelLead:Lead|null; setIntelLead:(lead:Lead|null)=>void; intelUrl:string; setIntelUrl:(value:string)=>void
 setIntelReport:(value:string)=>void; setIntelResult:(value:Analysis|null)=>void; setIntelChecks:(value:IntelligenceChecks|((current:IntelligenceChecks)=>IntelligenceChecks))=>void
 intelChecks:IntelligenceChecks; saveLeadWebsite:()=>void; analyzeWebsite:()=>void; intelAnalyzing:boolean; generateIntelligence:()=>void
 intelResult:Analysis|null; intelReport:string; copyIntelligence:()=>void; intelCopied:boolean
 intelligenceHistory:IntelligenceReport[]; applyIntelligenceReport:(report:IntelligenceReport)=>void; onGenerateProposalFromOpportunity:(report:IntelligenceReport)=>void
}

export function LeadIntelligence({leads,intelLead,setIntelLead,intelUrl,setIntelUrl,setIntelReport,setIntelResult,setIntelChecks,intelChecks,saveLeadWebsite,analyzeWebsite,intelAnalyzing,generateIntelligence,intelResult,intelReport,copyIntelligence,intelCopied,intelligenceHistory,applyIntelligenceReport,onGenerateProposalFromOpportunity}:Props){
 const hasWebsite=Boolean(intelLead?.website||intelUrl.trim())
 const assessment=assessIntelligence(intelChecks,hasWebsite)
 const setWebsite=(value:string)=>setIntelUrl(value)
 const selectLead=(value:string)=>{
  const l=leads.find(x=>String(x.id)===value)
  setIntelLead(l||null);setIntelUrl(l?.website||'');setIntelReport('');setIntelResult(null);setIntelChecks({...EMPTY_INTELLIGENCE_CHECKS})
 }
 return (<section className="panel intelligencePanel" id="intelligence">
  <div className="panelHead"><div><h2>Lead Intelligence</h2><p>Turn a prospect into a clear sales opportunity before you reach out.</p></div><span>{hasWebsite?'Opportunity scanner':'New website opportunity'}</span></div>
  <div className="intelligenceGrid"><div className="intelForm">
   <label className="field"><span className="fieldLabel">Choose a lead</span><select value={intelLead?.id||''} onChange={e=>selectLead(e.target.value)}><option value="">Select a prospect…</option>{leads.filter(l=>!['Won','Lost'].includes(l.status||'')).map(l=><option key={l.id} value={l.id}>{l.company} · {l.contact_name||'No contact'}</option>)}</select></label>
   <label className="field"><span className="fieldLabel">Website URL</span><input value={intelUrl} onChange={e=>setWebsite(e.target.value)} placeholder="https://example.com" inputMode="url"/>{intelLead&&!intelLead.website&&<small className="intelHint"><Globe2/> No website is saved for this lead. Leave this blank to assess it as a new website opportunity.</small>}</label>
   {intelLead&&<div className="intelLeadSummary"><strong>{intelLead.company}</strong><span>{intelLead.niche||'Business prospect'}{intelLead.location?' · '+intelLead.location:''}</span></div>}
   <div className="intelScoreCard"><div><small>OPPORTUNITY SCORE</small><strong>{assessment.score}/5</strong></div><div><small>{hasWebsite?'RECOMMENDED SERVICE':'OPPORTUNITY TYPE'}</small><strong>{hasWebsite?assessment.recommendedService:'New website'}</strong></div><div><small>ESTIMATED VALUE</small><strong>₦{assessment.estimatedValue.toLocaleString('en-NG')}</strong></div></div>
   <div className="intelChecks"><strong>Opportunity checklist</strong>{[['mobile','Mobile experience'],['cta','Clear call-to-action'],['contact','Contact options'],['ecommerce','E-commerce opportunity'],['seo','Basic SEO readiness']].map(([k,label])=><label className="checkRow" key={k}><input type="checkbox" checked={Boolean(intelChecks[k as keyof IntelligenceChecks])} onChange={e=>setIntelChecks(x=>({...x,[k]:e.target.checked}))}/><span>{label}</span></label>)}</div>
   <div className="intelButtons">{intelLead&&!intelLead.website&&<button type="button" className="secondary" onClick={saveLeadWebsite} disabled={!intelUrl.trim()||intelUrl.trim()===intelLead.website}>Save to lead</button>}<button type="button" className="primary" onClick={analyzeWebsite} disabled={!intelLead||!intelUrl.trim()||intelAnalyzing}><Target/>{intelAnalyzing?'Analyzing…':'Analyze Website'}</button><button type="button" className="secondary" onClick={generateIntelligence} disabled={!intelLead}><PlusCircle/>{intelResult?'Refresh Report':'Create Opportunity Report'}</button></div>
   {!hasWebsite&&intelLead&&<div className="intelNoWebsite"><strong>No website available</strong><span>This is a valid prospecting case. Create a new-website opportunity report instead of pretending an existing site was analyzed.</span></div>}
  </div><div className="intelReport"><div className="reportHead"><div><small>SALES INTELLIGENCE</small><strong>{hasWebsite?'Website Opportunity Report':'New Website Opportunity'}</strong>{intelResult&&<span className="analysisMeta">Automated analysis · {intelResult.response_ms||0} ms response</span>}</div><div className="intelButtons"><button type="button" className="secondary" onClick={copyIntelligence} disabled={!intelReport}>{intelCopied?'Copied':'Copy report'}</button>{intelReport&&intelligenceHistory[0]&&intelligenceHistory[0].leadId===Number(intelLead?.id)&&<button type="button" className="primary" onClick={()=>onGenerateProposalFromOpportunity(intelligenceHistory[0])}><Target/> Generate Proposal</button>}</div></div>{intelReport?<pre>{intelReport}</pre>:<div className="intelEmpty"><Target/><strong>Your report will appear here</strong><span>{hasWebsite?'Analyze the website or create a checklist report.':'Create a new-website opportunity report from the checklist.'}</span></div>}
   {intelLead&&<div className="intelHistory"><div className="reportHead"><div><small>HISTORY</small><strong>Saved intelligence reports</strong></div><span>{intelligenceHistory.length}</span></div>{intelligenceHistory.length?intelligenceHistory.map(report=><div className="intelHistoryRow" key={report.id}><div><strong>{report.reportType==='new_website'?'New website opportunity':'Website audit'} · {report.score}/5</strong><small>{new Date(report.createdAt).toLocaleString('en-NG')} · {report.recommendedService} · ₦{report.estimatedValue.toLocaleString('en-NG')}</small></div><div className="intelHistoryActions"><button type="button" className="secondary" onClick={()=>applyIntelligenceReport(report)}>Load</button><button type="button" className="primary" onClick={()=>onGenerateProposalFromOpportunity(report)}>Generate Proposal</button></div></div>):<div className="intelEmpty compact"><span>No saved intelligence reports for this lead yet.</span></div>}</div>}</div></div>
 </section>)
}
