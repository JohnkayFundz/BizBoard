alter table public.crm_leads
  add column if not exists opportunity_type text,
  add column if not exists outreach_status text not null default 'Not Contacted',
  add column if not exists last_contacted_at timestamptz;

alter table public.crm_leads
  drop constraint if exists crm_leads_outreach_status_check;

alter table public.crm_leads
  add constraint crm_leads_outreach_status_check
  check (outreach_status in ('Not Contacted','Sent','Bounced','Replied'));

update public.crm_leads
set opportunity_type = case id
  when 31 then 'Catalogue Upgrade'
  when 32 then 'New Website'
  when 33 then 'UX/Conversion Audit'
  when 34 then 'Brand Platform'
  when 35 then 'Catalogue Upgrade'
  when 36 then 'UX/Conversion Audit'
  when 37 then 'E-commerce UX Audit'
  when 38 then 'UX/Conversion'
  when 39 then 'Catalogue Upgrade'
  else opportunity_type
end
where id between 31 and 39;

update public.crm_leads
set outreach_status = case when id = 32 then 'Bounced' when id between 31 and 39 then 'Sent' else outreach_status end
where id between 31 and 39;

update public.crm_leads
set last_contacted_at = case
  when id = 32 then null
  when id between 31 and 39 then coalesce(last_contacted_at, updated_at)
  else last_contacted_at
end
where id between 31 and 39;

update public.crm_leads
set initial_outreach = case
  when id = 32 then jsonb_build_object('channel','Email','sent_at',null,'message_text',coalesce(initial_outreach->>'message_text',''),'status','failed')
  when id between 31 and 39 then jsonb_build_object('channel','Email','sent_at',last_contacted_at,'message_text',coalesce(initial_outreach->>'message_text',''),'status','sent')
  else initial_outreach
end
where id between 31 and 39;
