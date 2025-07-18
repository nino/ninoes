begin;

drop function if exists vote_beta;

create or replace function vote_beta(
  p_winner_id uuid,
  p_loser_id uuid,
  p_team_id uuid default null
) returns void
language plpgsql
security invoker
as $$
  declare
    v_user_id uuid := auth.uid();
    v_winner_elo int;
    v_loser_elo int;
    v_new_winner_elo int;
    v_new_loser_elo int;
    v_default_elo int := 1200;
    v_winner_vote_id uuid := gen_random_uuid();
    v_loser_vote_id uuid := gen_random_uuid();
  begin
    if p_winner_id is null then
      raise exception 'Winner ID cannot be null';
    end if;
    if p_loser_id is null then
      raise exception 'Loser ID cannot be null';
    end if;

    insert into "Votes" (id, name_id, user_id, vote_type, linked_vote) values
      (v_winner_vote_id, p_winner_id, v_user_id, 'up', v_loser_vote_id),
      (v_loser_vote_id, p_loser_id, v_user_id, 'down', v_winner_vote_id);

    select elo into v_winner_elo
    from team_elo
    where team_id = p_team_id and name_id = p_winner_id;

    select elo into v_loser_elo
    from team_elo
    where team_id = p_team_id and name_id = p_loser_id;

    if v_winner_elo is null then
      v_winner_elo := v_default_elo;
    end if;

    if v_loser_elo is null then
      v_loser_elo := v_default_elo;
    end if;

    select * from update_elo_ratings(v_winner_elo, v_loser_elo)
      into v_new_winner_elo, v_new_loser_elo;

    insert into team_elo (team_id, name_id, elo)
      values
        (p_team_id, p_winner_id, v_new_winner_elo),
        (p_team_id, p_loser_id, v_new_loser_elo)
      on conflict (team_id, name_id) do update set elo = excluded.elo;
  end;
$$;

commit;
