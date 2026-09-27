import { createClient } from 'npm:@supabase/supabase-js@2.112.3'
import { corsHeaders } from 'npm:@supabase/supabase-js@2.112.3/cors'

const response=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'content-type':'application/json'}})

const key=()=>{
  try{
    const k=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}')
    if(k.default)return k.default
  }catch{}
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||''
}

const hs=async(path:string,t:string)=>{
  const r=await fetch('https://api.hubapi.com'+path,{
    headers:{Authorization:'Bearer '+t,Accept:'application/json'}
  })
  const q=await r.text()
  let d:any
  try{d=JSON.parse(q)}catch{d={message:q}}
  if(!r.ok)throw new Error('HubSpot API '+r.status+': '+(d.message||q))
  return d
}

const mapStatus=(label:string)=>{
  const s=(label||'').toLowerCase()
  if(s.includes('closed lost')||s==='lost')return 'Lost'
  if(s.includes('closed won')||s==='won')return 'Won'
  if(s.includes('proposal'))return 'Proposal Sent'
  if(s.includes('interested')||s.includes('demo')||s.includes('negotiat'))return 'Interested'
  if(s.includes('repl'))return 'Replied'
  if(s.includes('contact'))return 'Contacted'
  return 'New Lead'
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders})
  if(req.method!=='POST')return response({success:false,error:'Method not allowed'},405)

  let phase='request'

  try{
    const a=req.headers.get('Authorization')||''
    const tok=a.toLowerCase().startsWith('bearer ')?a.slice(7).trim():a.trim()

    if(!tok)return response({success:false,phase:'token',error:'Authentication header missing'})

    phase='supabase-auth'
    const c=createClient(
      Deno.env.get('SUPABASE_URL')||'https://cjccdvdmsxhbsyztdblj.supabase.co',
      key(),
      {auth:{autoRefreshToken:false,persistSession:false}}
    )

    const{data:u,error:ue}=await c.auth.getUser(tok)
    if(ue||!u.user)return response({success:false,phase,error:ue?.message||'User not found'})

    phase='hubspot-config'
    const ht=Deno.env.get('HUBSPOT_ACCESS_TOKEN')||''
    if(!ht)return response({success:false,phase,error:'HUBSPOT_ACCESS_TOKEN is not configured'})

    phase='hubspot-pipelines'
    const ps=await hs('/crm/v3/pipelines/deals',ht)
    const stageMap=new Map<string,string>()

    for(const p of ps.results||[])
      for(const st of p.stages||[])
        stageMap.set(String(st.id),String(st.label||st.id))

    phase='hubspot-deals'
    const ds=await hs(
      '/crm/v3/objects/deals?limit=100&archived=false&properties=dealname,dealstage,amount,deal_currency_code,pipeline,createdate,hs_lastmodifieddate',
      ht
    )

    const rows=ds.results||[]

    phase='database-sync'
    let inserted=0,updated=0,contactsMatched=0,companiesMatched=0

    for(const d of rows){
      const p=d.properties||{}
      const stageLabel=stageMap.get(String(p.dealstage||''))||String(p.dealstage||'')

      let contact:any=null
      let company:any=null

      try{
        const detail=await hs(
          '/crm/v3/objects/deals/'+encodeURIComponent(String(d.id))+'?associations=contacts,companies',
          ht
        )

        const contactId=detail?.associations?.contacts?.results?.[0]?.id
        const companyId=detail?.associations?.companies?.results?.[0]?.id

        if(contactId){
          contact=await hs(
            '/crm/v3/objects/contacts/'+encodeURIComponent(String(contactId))+
            '?properties=firstname,lastname,email,phone,mobilephone,jobtitle,website,company,address,city,state,country,instagram',
            ht
          )
          contactsMatched++
        }

        if(companyId){
          company=await hs(
            '/crm/v3/objects/companies/'+encodeURIComponent(String(companyId))+
            '?properties=name,website,domain,phone,address,city,state,country,industry',
            ht
          )
          companiesMatched++
        }
      }catch(_e){}

      const cp=contact?.properties||{}
      const co=company?.properties||{}

      const fullName=[cp.firstname,cp.lastname].filter(Boolean).join(' ').trim()

      const website=String(
        co.website||
        co.domain||
        cp.website||
        ''
      ).trim()||null

      const payload={
        owner_id:u.user.id,
        company:String(p.dealname||'HubSpot Deal'),
        contact_name:fullName||null,
        role:String(cp.jobtitle||'')||null,
        email:String(cp.email||'')||null,
        phone:String(cp.phone||cp.mobilephone||'')||null,
        website,
        instagram:String(cp.instagram||'')||null,
        niche:String(cp.company||co.name||'')||null,
        location:[cp.city||co.city,cp.state||co.state,cp.country||co.country]
          .filter(Boolean).join(', ')||
          String(cp.address||co.address||'')||null,
        source:'HubSpot',
        status:mapStatus(stageLabel),
        deal_value:Number(p.amount||0)||0,
        hubspot_deal_id:Number(d.id)||null,
        hubspot_pipeline:String(p.pipeline||''),
        hubspot_deal_stage:stageLabel,
        notes:'Synced from HubSpot deal '+d.id
      }

      const{data:existing,error:findError}=await c
        .from('crm_leads')
        .select('id')
        .eq('owner_id',u.user.id)
        .eq('hubspot_deal_id',Number(d.id))
        .maybeSingle()

      if(findError)throw new Error('Database lookup failed: '+findError.message)

      if(existing){
        const{error}=await c
          .from('crm_leads')
          .update(payload)
          .eq('id',existing.id)
          .eq('owner_id',u.user.id)

        if(error)throw new Error('Database update failed: '+error.message)
        updated++
      }else{
        const{error}=await c.from('crm_leads').insert(payload)
        if(error)throw new Error('Database insert failed: '+error.message)
        inserted++
      }
    }

    return response({
      success:true,
      synced:inserted+updated,
      inserted,
      updated,
      totalFound:rows.length,
      contactsMatched,
      companiesMatched
    })
  }catch(e){
    return response({
      success:false,
      phase,
      error:e instanceof Error?e.message:String(e)
    })
  }
})
