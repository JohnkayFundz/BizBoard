import { Copy, ExternalLink, ChevronLeft, ChevronRight, X, Mail, Instagram, MessageCircle } from 'lucide-react'

type Lead={id:string|number;company?:string|null;contact_name?:string|null;email?:string|null;phone?:string|null;instagram?:string|null;website?:string|null;status?:string|null;niche?:string|null}
interface Props{
 open:boolean
 leads:Lead[]
 index:number
 setIndex:(value:number)=>void
 channel:string
 setChannel:(value:string)=>void
 message:string
 setMessage:(value:string)=>void
 copied:boolean
 copyMessage:()=>void
 dispatch:(lead:Lead,channel:string,message:string)=>void
 close:()=>void
}
export function OutreachCampaignModal({open,leads,index,setIndex,channel,setChannel,message,setMessage,copied,copyMessage,dispatch,close}:Props){
 if(!open)return null
 const lead=leads[index]
 if(!lead)return null
 const company=(lead.company||'your business').replace(/\s*[—-]\s*Website\s*$/i,'')
 const hasTarget=channel==='Email'?Boolean(lead.email):channel==='Instagram'?Boolean(lead.instagram):Boolean(lead.phone)
 return <div className="modalBackdrop campaignBackdrop" role="dialog" aria-modal="true" aria-labelledby="campaign-title">
   <div className="modal campaignModal">
    <div className="modalHead"><div><span className="eyebrow">OUTREACH CAMPAIGN</span><h2 id="campaign-title">Lead {index+1} of {leads.length}</h2><p>{company} · {lead.contact_name||'No contact name'}</p></div><button className="iconButton" onClick={close} aria-label="Close campaign"><X/></button></div>
    <div className="campaignProgress"><span style={{width:`${((index+1)/leads.length)*100}%`}} /></div>
    <div className="campaignLeadCard"><strong>{company}</strong><small>{lead.contact_name||'No contact name'} · {lead.niche||'Business prospect'} · {lead.status||'New Lead'}</small></div>
    <div className="channelTabs campaignTabs">{[['Email',Mail],['Instagram',Instagram],['WhatsApp',MessageCircle]].map(([name,Icon])=><button type="button" key={name} className={channel===name?'active':''} onClick={()=>setChannel(name as string)}><Icon/><span>{name}</span></button>)}</div>
    {!hasTarget&&<div className="channelNotice">No {channel.toLowerCase()} contact is saved for this lead. You can still edit the message, but add the missing contact before dispatching.</div>}
    <label className="field"><span className="fieldLabel">Personalized message</span><textarea rows={10} value={message} onChange={e=>setMessage(e.target.value)} /></label>
    <div className="campaignMeta"><span>{channel} · {message.trim().length} characters</span><span>{index===leads.length-1?'Last lead':'More leads in queue'}</span></div>
    <div className="campaignActions">
      <button className="secondary" onClick={()=>setIndex(Math.max(0,index-1))} disabled={index===0}><ChevronLeft/>Previous</button>
      <button className="secondary" onClick={copyMessage} disabled={!message.trim()}><Copy/>{copied?'Copied':'Copy message'}</button>
      <button className="primary" onClick={()=>dispatch(lead,channel,message)} disabled={!message.trim()||!hasTarget}><ExternalLink/>{channel==='Email'?'Open Email Client':channel==='Instagram'?'Open Instagram':'Open WhatsApp'}</button>
      <button className="secondary" onClick={()=>setIndex(Math.min(leads.length-1,index+1))} disabled={index===leads.length-1}>Next<ChevronRight/></button>
    </div>
   </div>
 </div>
}
