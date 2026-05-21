-- Single RPC for cron: purge chat + API rate ledgers in one round-trip.

create or replace function public.purge_rate_ledgers(
  p_older_than interval default interval '7 days'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chat bigint;
  v_api bigint;
begin
  v_chat := public.purge_chat_rate_events(p_older_than);
  v_api := public.purge_api_rate_events(p_older_than);
  return jsonb_build_object(
    'chat_rate_events_deleted', v_chat,
    'api_rate_events_deleted', v_api,
    'older_than', p_older_than::text
  );
end;
$$;

comment on function public.purge_rate_ledgers(interval)
  is 'Purge chat_rate_events and api_rate_events older than p_older_than; run daily via Vercel cron.';

grant execute on function public.purge_rate_ledgers(interval) to service_role;
