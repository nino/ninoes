DROP FUNCTION get_leaderboard(integer,integer,text,text);
-- Create a function to get the leaderboard
create or replace function get_leaderboard(
  p_limit integer default 50,
  p_offset integer default 0,
  p_order_by text default 'score',
  p_order_direction text default 'desc'
)
returns table (
  id uuid,
  name varchar,
  created_at timestamptz,
  score bigint,
  upvotes bigint,
  downvotes bigint,
  total bigint
)
language plpgsql
security definer
stable
as $$
declare
  v_order_by text;
  v_order_direction text;
begin
  -- Validate order_by parameter
  if p_order_by not in ('score', 'name', 'created_at', 'upvotes', 'downvotes') then
    v_order_by := 'score';
  else
    v_order_by := p_order_by;
  end if;

  -- Validate order_direction parameter
  if p_order_direction not in ('asc', 'desc') then
    v_order_direction := 'desc';
  else
    v_order_direction := p_order_direction;
  end if;

  return query
  with vote_counts as (
    select
      name_id,
      sum(case when vote_type = 'up' then 1 else 0 end) as upvotes,
      sum(case when vote_type = 'down' then 1 else 0 end) as downvotes
    from "Votes"
    group by name_id
  )
  select
    n.id,
    n.name,
    n.created_at,
    coalesce(vc.upvotes, 0) - coalesce(vc.downvotes, 0) as score,
    coalesce(vc.upvotes, 0) as upvotes,
    coalesce(vc.downvotes, 0) as downvotes,
    count(*) over() as total
  from "Names" n
  left join vote_counts vc on n.id = vc.name_id
  order by
    case when v_order_by = 'score' and v_order_direction = 'desc' then coalesce(vc.upvotes, 0) - coalesce(vc.downvotes, 0) end desc,
    case when v_order_by = 'score' and v_order_direction = 'asc' then coalesce(vc.upvotes, 0) - coalesce(vc.downvotes, 0) end asc,
    case when v_order_by = 'name' and v_order_direction = 'desc' then n.name end desc,
    case when v_order_by = 'name' and v_order_direction = 'asc' then n.name end asc,
    case when v_order_by = 'created_at' and v_order_direction = 'desc' then n.created_at end desc,
    case when v_order_by = 'created_at' and v_order_direction = 'asc' then n.created_at end asc,
    case when v_order_by = 'upvotes' and v_order_direction = 'desc' then coalesce(vc.upvotes, 0) end desc,
    case when v_order_by = 'upvotes' and v_order_direction = 'asc' then coalesce(vc.upvotes, 0) end asc,
    case when v_order_by = 'downvotes' and v_order_direction = 'desc' then coalesce(vc.downvotes, 0) end desc,
    case when v_order_by = 'downvotes' and v_order_direction = 'asc' then coalesce(vc.downvotes, 0) end asc
  limit p_limit
  offset p_offset;
end;
$$;