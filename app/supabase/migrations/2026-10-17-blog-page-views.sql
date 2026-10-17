-- Page views for ninoan.com.
--
-- Written by the blog's log shipper: a Vector instance on Fly that reads Caddy's
-- access log, keeps the page views, and inserts them here. Read by the blog stats
-- page in this app, through the blog_* functions at the bottom.
--
-- Everything lives in its own `analytics` schema, which isn't exposed through the
-- Supabase API. The log shipper connects to Postgres directly as blog_log_writer,
-- which can only insert. The app can only read, and only when signed in as Nino.
--
-- After running this, give the writer role a password from psql (use the
-- connection string from the dashboard's Connect dialog):
--
--    \password blog_log_writer
--
-- Not with `alter role ... password` in the SQL editor: the editor keeps a history
-- of the queries you run, so the password would stay stored in the dashboard.
-- \password sends only a hash.

begin;

create schema analytics;

create table analytics.page_views (
   -- Vector's postgres sink fills every column from the event and ignores column
   -- defaults, so there's no generated id or created_at: every column has to come
   -- from the log line.
   --
   -- The shipper has to send this as an ISO 8601 string. Caddy logs it as a Unix
   -- timestamp, which won't convert to timestamptz, and one bad row fails the
   -- whole batch.
   ts timestamptz not null,
   path text not null,
   -- The utm_* parameters from the query string, e.g. "utm_source=newsletter".
   -- Everything else is dropped on insert (see scrub_page_view below), since
   -- parameters like fbclid and gclid identify the person who clicked.
   query text,
   -- 200, or 304 for a repeat visit: HTML is served with max-age=0, so returning
   -- visitors revalidate and get a 304.
   status smallint not null,
   -- The Referer header without its query string or fragment, which can carry
   -- search terms or tokens. Usually just an origin anyway, since browsers default
   -- to strict-origin-when-cross-origin.
   referrer text,
   -- Its host, e.g. "news.ycombinator.com". Includes ninoan.com itself for
   -- clicks between pages; the reports leave those out.
   referrer_host text,
   user_agent text,
   -- A hash of a secret, the UTC date, the visitor's truncated IP and their user
   -- agent, computed by the log shipper. The same visitor on the same day gets the
   -- same hash, and hashes can't be linked across days.
   visitor_hash text not null
);

-- Rows arrive roughly in time order, so a BRIN index on ts is tiny and good enough
-- for the date-range scans the reports do.
create index page_views_ts_idx on analytics.page_views using brin (ts);

-- Enforces the column comments above for query and referrer, whatever the shipper
-- sends.
create function analytics.scrub_page_view()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
   new.referrer := nullif(regexp_replace(new.referrer, '[?#].*$', ''), '');
   new.query := (
      select string_agg(param, '&')
      from unnest(string_to_array(new.query, '&')) as param
      where param like 'utm\_%'
   );
   return new;
end;
$$;

create trigger scrub_page_view
   before insert on analytics.page_views
   for each row execute function analytics.scrub_page_view();

alter table analytics.page_views enable row level security;

-- The log shipper: insert, nothing else. That's enough for Vector's postgres sink,
-- which runs `INSERT INTO <table> SELECT * FROM jsonb_populate_recordset(...)`
-- with no RETURNING or ON CONFLICT.
create role blog_log_writer login;
grant usage on schema analytics to blog_log_writer;
grant insert on analytics.page_views to blog_log_writer;
create policy "Log shipper can insert page views"
   on analytics.page_views for insert to blog_log_writer
   with check (true);

-- The app: read, only as Nino. The policy pins Nino's user id, looked up here so it
-- doesn't have to be pasted in; `into strict` makes the migration fail if that
-- account doesn't exist.
grant usage on schema analytics to authenticated;
grant select on analytics.page_views to authenticated;
do $$
declare
   nino uuid;
begin
   select id into strict nino from auth.users where email = 'nino@ninoan.com';
   execute format(
      'create policy "Nino can read page views" on analytics.page_views '
         'for select to authenticated using ((select auth.uid()) = %L)',
      nino
   );
end
$$;

-- Reports.
--
-- They're security invoker, so the policy above decides what they return: anyone
-- signed in as someone else gets empty results. Days, and the date range, are in
-- UTC, matching the day the visitor hash is computed for. The functions pin the
-- session timezone to UTC as well, so a timezone setting on the database, role or
-- request can't shift day boundaries.
--
-- Every signed-in ninoes user can call them, so the date range is capped: without
-- that, a range like 0001-01-01 to 9999-12-31 would tie up the database.
create function analytics.check_report_range(from_day date, to_day date)
returns void
language plpgsql
set search_path = ''
as $$
begin
   if from_day is null or to_day is null
      or to_day < from_day or to_day - from_day > 3660 then
      raise exception 'Report range must run forwards and span at most 10 years; got % to %',
         from_day, to_day
         using errcode = 'invalid_parameter_value';
   end if;
end;
$$;

-- One row per day in the range, including days with no views. `visitors` is the
-- number of distinct visitor hashes that day.
create function public.blog_daily_views(from_day date, to_day date)
returns table (day date, views bigint, visitors bigint)
language plpgsql
stable
security invoker
set search_path = ''
set timezone = 'UTC'
as $$
begin
   perform analytics.check_report_range(from_day, to_day);
   return query
      with per_day as (
         select
            (v.ts at time zone 'UTC')::date as view_day,
            count(*) as view_count,
            count(distinct v.visitor_hash) as visitor_count
         from analytics.page_views as v
         where v.ts >= from_day::timestamp at time zone 'UTC'
            and v.ts < (to_day + 1)::timestamp at time zone 'UTC'
         group by 1
      )
      select
         d.series_day::date,
         coalesce(p.view_count, 0),
         coalesce(p.visitor_count, 0)
      from generate_series(from_day::timestamp, to_day::timestamp, interval '1 day')
         as d (series_day)
      left join per_day as p on p.view_day = d.series_day::date
      order by 1;
end;
$$;

-- `visitor_days` counts distinct visitor hashes, and a hash only lasts a day, so
-- someone who reads a page on three days counts three times. There's no way to
-- count unique people over longer than a day without a longer-lived identifier.
create function public.blog_top_pages(
   from_day date,
   to_day date,
   max_rows integer default 20
)
returns table (path text, views bigint, visitor_days bigint)
language plpgsql
stable
security invoker
set search_path = ''
set timezone = 'UTC'
as $$
begin
   perform analytics.check_report_range(from_day, to_day);
   return query
      select v.path, count(*), count(distinct v.visitor_hash)
      from analytics.page_views as v
      where v.ts >= from_day::timestamp at time zone 'UTC'
         and v.ts < (to_day + 1)::timestamp at time zone 'UTC'
      group by v.path
      order by 2 desc, 1
      limit max_rows;
end;
$$;

-- Other sites that sent visitors. Leaves out visits with no Referer, and clicks
-- from one page of the blog to another. `visitor_days` as for blog_top_pages.
create function public.blog_top_referrers(
   from_day date,
   to_day date,
   max_rows integer default 20
)
returns table (referrer_host text, views bigint, visitor_days bigint)
language plpgsql
stable
security invoker
set search_path = ''
set timezone = 'UTC'
as $$
begin
   perform analytics.check_report_range(from_day, to_day);
   return query
      select v.referrer_host, count(*), count(distinct v.visitor_hash)
      from analytics.page_views as v
      where v.ts >= from_day::timestamp at time zone 'UTC'
         and v.ts < (to_day + 1)::timestamp at time zone 'UTC'
         and v.referrer_host is not null
         and v.referrer_host not in ('ninoan.com', 'www.ninoan.com')
      group by v.referrer_host
      order by 2 desc, 1
      limit max_rows;
end;
$$;

-- Supabase grants execute on new functions in public to anon; these are for
-- signed-in use only.
revoke execute on function
   public.blog_daily_views(date, date),
   public.blog_top_pages(date, date, integer),
   public.blog_top_referrers(date, date, integer)
from public, anon;
grant execute on function
   public.blog_daily_views(date, date),
   public.blog_top_pages(date, date, integer),
   public.blog_top_referrers(date, date, integer)
to authenticated;

commit;
