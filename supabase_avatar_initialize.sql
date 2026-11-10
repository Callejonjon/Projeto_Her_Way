-- Complemento do Passo 1: primeira visita ao editor.
-- Cria o look padrão e concede apenas os itens gratuitos, sem XP e sem prêmios falsos.
create or replace function public.avatar_initialize()
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid(); v_added integer;
begin
 if v_uid is null then raise exception 'Faça login para criar seu avatar'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_uid::text,2026));
 insert into public.user_avatar_inventory(user_id,item_id)
 select v_uid,id from public.avatar_items
 where active and unlock_type='free'
 on conflict do nothing;
 get diagnostics v_added=row_count;
 insert into public.user_avatar_config(user_id) values(v_uid)
 on conflict(user_id) do nothing;
 return v_added;
end $$;
revoke all on function public.avatar_initialize() from public,anon,authenticated;
grant execute on function public.avatar_initialize() to authenticated;
