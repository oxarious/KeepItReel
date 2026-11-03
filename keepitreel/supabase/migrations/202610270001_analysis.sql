-- Run as the project owner. No article bodies are stored.
create table public.analysis_limits (
  id boolean primary key default true check (id),
  user_monthly_credits integer not null default 20 check (user_monthly_credits between 0 and 10000),
  global_monthly_credits integer not null default 2000 check (global_monthly_credits between 0 and 1000000)
);
insert into public.analysis_limits(id) values (true);
create table public.analysis_usage (
  scope text not null,
  month date not null,
  credits integer not null default 0 check (credits >= 0),
  primary key(scope, month)
);
create table public.analysis_requests (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  text_hash text not null,
  credits integer not null check (credits between 3 and 10),
  month date not null,
  status text not null default 'creating' check (status in ('creating','pending','complete','failed','uncertain')),
  task_id text,
  model text,
  result jsonb,
  refunded boolean not null default false,
  created_at timestamptz not null default now()
);
create index analysis_requests_user_time on public.analysis_requests(user_id, created_at);
alter table public.analysis_limits enable row level security;
alter table public.analysis_usage enable row level security;
alter table public.analysis_requests enable row level security;
revoke all on public.analysis_limits, public.analysis_usage, public.analysis_requests from anon, authenticated;
grant all on public.analysis_limits, public.analysis_usage, public.analysis_requests to service_role;

create function public.reserve_analysis(p_user uuid, p_request uuid, p_credits integer, p_hash text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_month date := date_trunc('month', now() at time zone 'UTC')::date;
  v_request public.analysis_requests;
  v_limits public.analysis_limits;
  v_user integer;
  v_global integer;
begin
  if p_credits not between 3 and 10 or length(p_hash) <> 64 then raise exception 'invalid_request'; end if;
  -- Serialize reservations, including global quota checks, across concurrent invocations.
  perform pg_advisory_xact_lock(782104913);
  select * into v_request from public.analysis_requests where id=p_request;
  if found then
    if v_request.user_id <> p_user or v_request.text_hash <> p_hash or v_request.credits <> p_credits then raise exception 'request_conflict'; end if;
    return jsonb_build_object('created', false, 'request', to_jsonb(v_request));
  end if;
  if (select count(*) from public.analysis_requests where user_id=p_user and created_at > now()-interval '1 minute') >= 6 then raise exception 'rate_limit'; end if;
  select * into strict v_limits from public.analysis_limits where id=true;
  insert into public.analysis_usage(scope, month) values(p_user::text, v_month),('global',v_month) on conflict do nothing;
  select credits into v_user from public.analysis_usage where scope=p_user::text and month=v_month;
  select credits into v_global from public.analysis_usage where scope='global' and month=v_month;
  if v_user+p_credits > v_limits.user_monthly_credits then raise exception 'user_quota'; end if;
  if v_global+p_credits > v_limits.global_monthly_credits then raise exception 'global_quota'; end if;
  update public.analysis_usage set credits=credits+p_credits where month=v_month and scope in(p_user::text,'global');
  insert into public.analysis_requests(id,user_id,text_hash,credits,month) values(p_request,p_user,p_hash,p_credits,v_month) returning * into v_request;
  return jsonb_build_object('created', true, 'request', to_jsonb(v_request));
end $$;

create function public.release_analysis(p_request uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_request public.analysis_requests;
begin
  perform pg_advisory_xact_lock(782104913);
  select * into v_request from public.analysis_requests where id=p_request for update;
  if not found or v_request.refunded then return; end if;
  update public.analysis_usage set credits=greatest(0,credits-v_request.credits) where month=v_request.month and scope in(v_request.user_id::text,'global');
  update public.analysis_requests set refunded=true,status='failed' where id=p_request;
end $$;
revoke all on function public.reserve_analysis(uuid,uuid,integer,text) from public, anon, authenticated;
revoke all on function public.release_analysis(uuid) from public, anon, authenticated;
grant execute on function public.reserve_analysis(uuid,uuid,integer,text) to service_role;
grant execute on function public.release_analysis(uuid) to service_role;

-- Invite-only pilot: create users through the Auth dashboard. Do not enable public signup.
-- Retention: operator should periodically delete analysis_requests older than 90 days.
-- Usage rows are retained for spending reconciliation. Never delete active-month usage.
