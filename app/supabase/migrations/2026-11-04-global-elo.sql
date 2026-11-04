-- An Elo leaderboard for everyone: global_elo holds one rating per name, built
-- from every user's head-to-head votes in the order they were cast. It's kept
-- in sync the same way as user_elo and team_elo (2026-10-30-derived-elo.sql):
-- a new vote updates it in place, and deleting or editing a vote replays it.
-- Team memberships don't affect it. Any signed-in user can read it.

BEGIN;

CREATE TABLE public.global_elo (
  name_id uuid NOT NULL REFERENCES public."Names" (id) ON UPDATE CASCADE ON DELETE CASCADE,
  elo integer NOT NULL,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  updated_at timestamp WITH time zone NOT NULL DEFAULT NOW(),
  CONSTRAINT global_elo_pkey PRIMARY KEY (name_id)
);

CREATE INDEX global_elo_elo_idx ON public.global_elo (elo DESC);

ALTER TABLE public.global_elo ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.global_elo FROM anon, authenticated;
GRANT SELECT ON public.global_elo TO authenticated;
CREATE POLICY "Signed-in users read everyone's ratings" ON public.global_elo
  FOR SELECT TO authenticated USING (true);

-- Applies one match to global_elo, like elo_record_match does for the others.
CREATE FUNCTION public.elo_record_global_match(p_winner_id uuid, p_loser_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_default_elo int := 1200;
  v_winner_elo int;
  v_loser_elo int;
  v_new_winner_elo int;
  v_new_loser_elo int;
BEGIN
  SELECT elo INTO v_winner_elo FROM global_elo WHERE name_id = p_winner_id FOR UPDATE;
  SELECT elo INTO v_loser_elo FROM global_elo WHERE name_id = p_loser_id FOR UPDATE;

  SELECT * FROM update_elo_ratings(
    coalesce(v_winner_elo, v_default_elo),
    coalesce(v_loser_elo, v_default_elo)
  ) INTO v_new_winner_elo, v_new_loser_elo;

  INSERT INTO global_elo AS g (name_id, elo, wins, losses, updated_at)
  VALUES
    (p_winner_id, v_new_winner_elo, 1, 0, now()),
    (p_loser_id, v_new_loser_elo, 0, 1, now())
  ON CONFLICT (name_id) DO UPDATE SET
    elo = excluded.elo,
    wins = g.wins + excluded.wins,
    losses = g.losses + excluded.losses,
    updated_at = excluded.updated_at;
END;
$$;

CREATE FUNCTION public.elo_rebuild_global() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM global_elo WHERE true;
  INSERT INTO global_elo (name_id, elo, wins, losses)
  SELECT r.name_id, r.elo, r.wins, r.losses
  FROM elo_replay(ARRAY(SELECT id FROM "Users")) r;
END;
$$;

CREATE OR REPLACE FUNCTION public.elo_rebuild_all() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM elo_rebuild_user(id) FROM "Users";
  PERFORM elo_rebuild_team(id) FROM teams;
  PERFORM elo_rebuild_global();
END;
$$;

-- The vote triggers, now also keeping global_elo up to date.

CREATE OR REPLACE FUNCTION public.elo_on_votes_inserted() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_vote_ids uuid[];
  m record;
  v_team_id uuid;
BEGIN
  -- An array and a union rather than a join and OR, so both lookups use the
  -- primary key instead of pairing up every vote first.
  SELECT array_agg(id) INTO v_vote_ids FROM new_votes;
  FOR m IN
    SELECT em.id, em.created_at, em.user_id, em.winner_id, em.loser_id
    FROM elo_matches em WHERE em.id = ANY (v_vote_ids)
    UNION
    SELECT em.id, em.created_at, em.user_id, em.winner_id, em.loser_id
    FROM elo_matches em WHERE em.loser_vote_id = ANY (v_vote_ids)
    ORDER BY created_at, id
  LOOP
    PERFORM elo_record_global_match(m.winner_id, m.loser_id);
    PERFORM elo_record_match(NULL, m.user_id, m.winner_id, m.loser_id);
    FOR v_team_id IN
      SELECT DISTINCT team_id FROM "TeamMemberships"
      WHERE user_id = m.user_id AND team_id IS NOT NULL
    LOOP
      PERFORM elo_record_match(v_team_id, NULL, m.winner_id, m.loser_id);
    END LOOP;
  END LOOP;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.elo_on_votes_changed() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_ids uuid[];
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT array_agg(DISTINCT user_id) INTO v_user_ids FROM old_votes;
  ELSE
    SELECT array_agg(DISTINCT user_id) INTO v_user_ids FROM (
      SELECT user_id FROM old_votes UNION SELECT user_id FROM new_votes
    ) changed;
  END IF;

  PERFORM elo_rebuild_user(user_id) FROM unnest(v_user_ids) AS user_id;
  PERFORM elo_rebuild_team(team_id) FROM (
    SELECT DISTINCT team_id FROM "TeamMemberships"
    WHERE team_id IS NOT NULL AND user_id = ANY (v_user_ids)
  ) affected;
  PERFORM elo_rebuild_global();
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION
  public.elo_record_global_match(uuid, uuid),
  public.elo_rebuild_global()
FROM PUBLIC, anon, authenticated;

-- Backfill.
SELECT public.elo_rebuild_global();

COMMIT;
