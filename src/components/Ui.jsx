import { ChevronDown } from 'lucide-react'

export function Metric({icon,label,value}){
  return <div className="metric"><i>{icon}</i><span><small>{label}</small><strong>{value}</strong></span></div>
}

export function Select({icon,value,set,options}){
  return <div className="select">{icon}<select value={value} onChange={e=>set(e.target.value)}>{options.map(x=><option key={x}>{x}</option>)}</select><ChevronDown/></div>
}

export function FollowupCard({title,items,empty,tone,onActivity}){
  return <div className={'followupCard '+tone}>
    <div className="followupTitle"><strong>{title}</strong><span>{items.length}</span></div>
    {items.length ? items.map(l=>
      <button className="followupItem" key={l.id} onClick={()=>onActivity(l)}>
        <span><b>{l.company}</b><small>{l.contact_name||'No contact name'} · {l.status}</small></span>
        <time>{l.next_follow_up}</time>
      </button>
    ) : <div className="followupEmpty">{empty}</div>}
  </div>
}
