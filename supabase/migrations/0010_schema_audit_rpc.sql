-- Alt.FFF - Migration 0010: read-only schema audit RPC for check:migrations
-- SECURITY DEFINER function used by scripts/check-migrations.mjs to compare
-- live pg_policy / table / column state against migration files 0001-0009.
-- Callable only by service_role (not anon/authenticated).

create or replace function public.get_schema_audit_state()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'policies', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'table', tablename,
          'name', policyname,
          'cmd', cmd
        )
        order by tablename, policyname
      )
      from pg_policies
      where schemaname = 'public'
    ), '[]'::jsonb),
    'tables', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'table', t.table_name,
          'columns', (
            select coalesce(jsonb_agg(c.column_name order by c.ordinal_position), '[]'::jsonb)
            from information_schema.columns c
            where c.table_schema = 'public'
              and c.table_name = t.table_name
          )
        )
        order by t.table_name
      )
      from information_schema.tables t
      where t.table_schema = 'public'
        and t.table_type = 'BASE TABLE'
        and t.table_name not like 'pg_%'
    ), '[]'::jsonb),
    'rls_enabled', coalesce((
      select jsonb_agg(c.relname order by c.relname)
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind = 'r'
        and c.relrowsecurity = true
    ), '[]'::jsonb),
    'realtime_tables', coalesce((
      select jsonb_agg(pt.tablename order by pt.tablename)
      from pg_publication_tables pt
      where pt.pubname = 'supabase_realtime'
        and pt.schemaname = 'public'
    ), '[]'::jsonb),
    'indexes', coalesce((
      select jsonb_agg(
        jsonb_build_object('table', t.relname, 'name', i.relname)
        order by t.relname, i.relname
      )
      from pg_class t
      join pg_index ix on ix.indrelid = t.oid
      join pg_class i on i.oid = ix.indexrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public'
        and t.relkind = 'r'
        and not ix.indisprimary
    ), '[]'::jsonb),
    'constraints', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'table', rel.relname,
          'name', con.conname,
          'type', con.contype
        )
        order by rel.relname, con.conname
      )
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace n on n.oid = rel.relnamespace
      where n.nspname = 'public'
        and con.contype in ('c', 'u', 'f', 'p')
    ), '[]'::jsonb)
  )
  into result;

  return result;
end;
$$;

revoke all on function public.get_schema_audit_state() from public;
revoke all on function public.get_schema_audit_state() from anon;
revoke all on function public.get_schema_audit_state() from authenticated;
grant execute on function public.get_schema_audit_state() to service_role;

comment on function public.get_schema_audit_state() is
  'Returns live public-schema policies, columns, RLS, realtime publication, indexes, and constraints as JSON for migration drift checks.';
