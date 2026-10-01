alter table public.crm_leads drop constraint if exists crm_leads_status_check;

alter table public.crm_leads
  add constraint crm_leads_status_check
  check (status in ('New Lead','Contacted','Replied','Interested','Proposal Sent','Bounced / Correction Required','Won','Lost'));

update public.crm_leads
set status='Bounced / Correction Required',
    outreach_status='Bounced',
    last_contacted_at=null,
    updated_at=now()
where company='Sample Wear Boutique';
