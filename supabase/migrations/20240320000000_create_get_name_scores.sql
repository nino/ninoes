-- Create a function to get name scores
create or replace function get_leaderboard()
returns table (
  id uuid,
  name text,
  created_at timestamptz,
  score bigint,
  upvotes bigint,
  downvotes bigint
)
language sql
security definer
stable
as $$
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
    coalesce(vc.downvotes, 0) as downvotes
  from "Names" n
  left join vote_counts vc on n.id = vc.name_id
  order by score desc, name asc;
$$; 