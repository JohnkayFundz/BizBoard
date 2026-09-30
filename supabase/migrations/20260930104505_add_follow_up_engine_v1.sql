alter table public.crm_leads
  add column if not exists initial_outreach jsonb not null default '{"channel":null,"sent_at":null,"message_text":null,"status":"not_sent"}'::jsonb,
  add column if not exists follow_ups jsonb not null default '[]'::jsonb,
  add column if not exists sequence_status text not null default 'paused';

alter table public.crm_leads
  drop constraint if exists crm_leads_sequence_status_check;

alter table public.crm_leads
  add constraint crm_leads_sequence_status_check
  check (sequence_status in ('active','paused','completed','stopped_replied'));

create or replace function public.sync_crm_lead_sequence_status()
returns trigger
language plpgsql
as $$
begin
  if new.status in ('Replied','Interested','Proposal Sent','Won') then
    new.sequence_status := 'stopped_replied';
  end if;
  return new;
end;
$$;

drop trigger if exists crm_lead_sequence_status_sync on public.crm_leads;

create trigger crm_lead_sequence_status_sync
before insert or update of status on public.crm_leads
for each row
execute function public.sync_crm_lead_sequence_status();
