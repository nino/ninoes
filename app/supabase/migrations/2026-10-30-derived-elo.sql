-- Elo scores derived from votes.
--
-- Before: the `vote` RPC took a team id, read that team's row from team_elo,
-- computed new ratings and wrote them back. Only the team passed in got a
-- rating, and nothing else could be ranked.
--
-- After: `vote` only records the two linked votes. Triggers keep two read-only
-- tables up to date from the votes:
--
--   user_elo  one rating per (user, name), from that user's own head-to-head votes
--   team_elo  one rating per (team, name), from the votes of the team's current
--             members, in the order they were cast
--
-- A new vote updates the voter's ratings and those of each of their teams in
-- place. Anything that changes history (deleting or editing a vote, joining or
-- leaving a team) replays that user's or team's votes from scratch. The apps
-- can only read these tables; all writes come from the triggers.
--
-- The old team_elo is kept as team_elo_before_derived until a later migration
-- drops it.

BEGIN;

-- 1. Votes: make sure the pairing column exists, and index what the replays read.

ALTER TABLE public."Votes"
  ADD COLUMN IF NOT EXISTS linked_vote uuid NULL
    REFERENCES public."Votes" (id) ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS votes_user_id_created_at_idx
  ON public."Votes" (user_id, created_at);
CREATE INDEX IF NOT EXISTS votes_linked_vote_idx
  ON public."Votes" (linked_vote);

-- 2. One row per head-to-head vote. A pair is an up and a down vote by the same
-- user that point at each other through linked_vote. Pairs from before
-- linked_vote was filled in are matched on user and identical created_at, which
-- is what inserting both votes in one statement produces. Two separate joins so
-- each can use an index.

CREATE VIEW public.elo_matches WITH (security_invoker = true) AS
SELECT
  w.id AS id,
  l.id AS loser_vote_id,
  w.user_id,
  w.created_at,
  w.name_id AS winner_id,
  l.name_id AS loser_id
FROM public."Votes" w
JOIN public."Votes" l ON l.id = w.linked_vote
WHERE w.vote_type = 'up'
  AND l.vote_type = 'down'
  AND l.user_id = w.user_id
  AND l.name_id <> w.name_id
UNION ALL
SELECT w.id, l.id, w.user_id, w.created_at, w.name_id, l.name_id
FROM public."Votes" w
JOIN public."Votes" l ON l.user_id = w.user_id AND l.created_at = w.created_at
WHERE w.vote_type = 'up'
  AND l.vote_type = 'down'
  AND w.linked_vote IS NULL
  AND l.linked_vote IS NULL
  AND l.name_id <> w.name_id;

REVOKE ALL ON public.elo_matches FROM anon, authenticated;

-- 3. The derived tables.

ALTER TABLE public.team_elo RENAME TO team_elo_before_derived;
REVOKE ALL ON public.team_elo_before_derived FROM anon, authenticated;

CREATE TABLE public.team_elo (
  team_id uuid NOT NULL REFERENCES public.teams (id) ON UPDATE CASCADE ON DELETE CASCADE,
  name_id uuid NOT NULL REFERENCES public."Names" (id) ON UPDATE CASCADE ON DELETE CASCADE,
  elo integer NOT NULL,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  updated_at timestamp WITH time zone NOT NULL DEFAULT NOW(),
  -- Named so they don't clash with the old table's constraints.
  CONSTRAINT team_elo_derived_pkey PRIMARY KEY (team_id, name_id)
);

CREATE TABLE public.user_elo (
  user_id uuid NOT NULL REFERENCES public."Users" (id) ON UPDATE CASCADE ON DELETE CASCADE,
  name_id uuid NOT NULL REFERENCES public."Names" (id) ON UPDATE CASCADE ON DELETE CASCADE,
  elo integer NOT NULL,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  updated_at timestamp WITH time zone NOT NULL DEFAULT NOW(),
  CONSTRAINT user_elo_pkey PRIMARY KEY (user_id, name_id)
);

CREATE INDEX team_elo_team_id_elo_idx ON public.team_elo (team_id, elo DESC);
CREATE INDEX user_elo_user_id_elo_idx ON public.user_elo (user_id, elo DESC);

-- 4. Who can see what: your own ratings, your teams' ratings, and the ratings
-- of anyone you share a team with. The checks are SECURITY DEFINER so they see
-- every membership, whatever TeamMemberships' own policies allow.

CREATE FUNCTION public.is_team_member(p_team_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM "TeamMemberships"
    WHERE team_id = p_team_id AND user_id = auth.uid()
  );
$$;

CREATE FUNCTION public.shares_team_with(p_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_user_id = auth.uid() OR EXISTS (
    SELECT 1
    FROM "TeamMemberships" mine
    JOIN "TeamMemberships" theirs ON theirs.team_id = mine.team_id
    WHERE mine.user_id = auth.uid() AND theirs.user_id = p_user_id
  );
$$;

ALTER TABLE public.team_elo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_elo ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.team_elo, public.user_elo FROM anon, authenticated;
GRANT SELECT ON public.team_elo, public.user_elo TO authenticated;

CREATE POLICY "Members read their teams' ratings" ON public.team_elo
  FOR SELECT TO authenticated USING (public.is_team_member(team_id));

CREATE POLICY "Teammates read each other's ratings" ON public.user_elo
  FOR SELECT TO authenticated USING (public.shares_team_with(user_id));

-- The leaderboards a signed-in user can pick from: themselves (team_id null),
-- each of their teams (user_id null) and each member of each team.
CREATE FUNCTION public.my_elo_leaderboards()
RETURNS TABLE (team_id uuid, team_name varchar, user_id uuid, user_name varchar)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NULL::uuid, NULL::varchar, u.id, u.name
  FROM "Users" u
  WHERE u.id = auth.uid()
  UNION ALL
  SELECT DISTINCT t.id, t.name, NULL::uuid, NULL::varchar
  FROM teams t
  JOIN "TeamMemberships" mine ON mine.team_id = t.id AND mine.user_id = auth.uid()
  UNION ALL
  SELECT DISTINCT t.id, t.name, u.id, u.name
  FROM teams t
  JOIN "TeamMemberships" mine ON mine.team_id = t.id AND mine.user_id = auth.uid()
  JOIN "TeamMemberships" member ON member.team_id = t.id
  JOIN "Users" u ON u.id = member.user_id;
$$;

-- 5. Applying one match to one rating table. Exactly one of p_team_id and
-- p_user_id is set. Uses update_elo_ratings, so the K factor and rounding are
-- the same as before.

CREATE FUNCTION public.elo_record_match(
  p_team_id uuid,
  p_user_id uuid,
  p_winner_id uuid,
  p_loser_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_default_elo int := 1200;
  v_winner_elo int;
  v_loser_elo int;
  v_new_winner_elo int;
  v_new_loser_elo int;
BEGIN
  IF p_team_id IS NOT NULL THEN
    SELECT elo INTO v_winner_elo FROM team_elo
      WHERE team_id = p_team_id AND name_id = p_winner_id FOR UPDATE;
    SELECT elo INTO v_loser_elo FROM team_elo
      WHERE team_id = p_team_id AND name_id = p_loser_id FOR UPDATE;
  ELSE
    SELECT elo INTO v_winner_elo FROM user_elo
      WHERE user_id = p_user_id AND name_id = p_winner_id FOR UPDATE;
    SELECT elo INTO v_loser_elo FROM user_elo
      WHERE user_id = p_user_id AND name_id = p_loser_id FOR UPDATE;
  END IF;

  SELECT * FROM update_elo_ratings(
    coalesce(v_winner_elo, v_default_elo),
    coalesce(v_loser_elo, v_default_elo)
  ) INTO v_new_winner_elo, v_new_loser_elo;

  IF p_team_id IS NOT NULL THEN
    INSERT INTO team_elo AS t (team_id, name_id, elo, wins, losses, updated_at)
    VALUES
      (p_team_id, p_winner_id, v_new_winner_elo, 1, 0, now()),
      (p_team_id, p_loser_id, v_new_loser_elo, 0, 1, now())
    ON CONFLICT (team_id, name_id) DO UPDATE SET
      elo = excluded.elo,
      wins = t.wins + excluded.wins,
      losses = t.losses + excluded.losses,
      updated_at = excluded.updated_at;
  ELSE
    INSERT INTO user_elo AS u (user_id, name_id, elo, wins, losses, updated_at)
    VALUES
      (p_user_id, p_winner_id, v_new_winner_elo, 1, 0, now()),
      (p_user_id, p_loser_id, v_new_loser_elo, 0, 1, now())
    ON CONFLICT (user_id, name_id) DO UPDATE SET
      elo = excluded.elo,
      wins = u.wins + excluded.wins,
      losses = u.losses + excluded.losses,
      updated_at = excluded.updated_at;
  END IF;
END;
$$;

-- 6. Replaying a user's or a team's votes from scratch. The replay keeps the
-- ratings in arrays and returns them at the end, rather than updating rows match
-- by match: a popular name can be in thousands of matches, and updating its row
-- that often in one transaction gets slow.

CREATE FUNCTION public.elo_replay(p_user_ids uuid[])
RETURNS TABLE (name_id uuid, elo int, wins int, losses int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
DECLARE
  v_default_elo int := 1200;
  v_names uuid[];
  v_elo int[];
  v_wins int[];
  v_losses int[];
  v_new_winner_elo int;
  v_new_loser_elo int;
  m record;
BEGIN
  SELECT array_agg(n ORDER BY n) INTO v_names FROM (
    SELECT winner_id AS n FROM elo_matches WHERE user_id = ANY (p_user_ids)
    UNION
    SELECT loser_id FROM elo_matches WHERE user_id = ANY (p_user_ids)
  ) names;
  IF v_names IS NULL THEN
    RETURN;
  END IF;

  v_elo := array_fill(v_default_elo, ARRAY[cardinality(v_names)]);
  v_wins := array_fill(0, ARRAY[cardinality(v_names)]);
  v_losses := array_fill(0, ARRAY[cardinality(v_names)]);

  FOR m IN
    SELECT w.idx AS w, l.idx AS l
    FROM elo_matches em
    JOIN unnest(v_names) WITH ORDINALITY AS w (n, idx) ON w.n = em.winner_id
    JOIN unnest(v_names) WITH ORDINALITY AS l (n, idx) ON l.n = em.loser_id
    WHERE em.user_id = ANY (p_user_ids)
    ORDER BY em.created_at, em.id
  LOOP
    SELECT * FROM update_elo_ratings(v_elo[m.w], v_elo[m.l])
      INTO v_new_winner_elo, v_new_loser_elo;
    v_elo[m.w] := v_new_winner_elo;
    v_elo[m.l] := v_new_loser_elo;
    v_wins[m.w] := v_wins[m.w] + 1;
    v_losses[m.l] := v_losses[m.l] + 1;
  END LOOP;

  RETURN QUERY SELECT * FROM unnest(v_names, v_elo, v_wins, v_losses);
END;
$$;

CREATE FUNCTION public.elo_rebuild_user(p_user_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM user_elo WHERE user_id = p_user_id;
  IF NOT EXISTS (SELECT 1 FROM "Users" WHERE id = p_user_id) THEN
    RETURN;
  END IF;
  INSERT INTO user_elo (user_id, name_id, elo, wins, losses)
  SELECT p_user_id, r.name_id, r.elo, r.wins, r.losses
  FROM elo_replay(ARRAY[p_user_id]) r;
END;
$$;

CREATE FUNCTION public.elo_rebuild_team(p_team_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM team_elo WHERE team_id = p_team_id;
  IF NOT EXISTS (SELECT 1 FROM teams WHERE id = p_team_id) THEN
    RETURN;
  END IF;
  INSERT INTO team_elo (team_id, name_id, elo, wins, losses)
  SELECT p_team_id, r.name_id, r.elo, r.wins, r.losses
  FROM elo_replay(ARRAY(
    SELECT user_id FROM "TeamMemberships"
    WHERE team_id = p_team_id AND user_id IS NOT NULL
  )) r;
END;
$$;

CREATE FUNCTION public.elo_rebuild_all() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM elo_rebuild_user(id) FROM "Users";
  PERFORM elo_rebuild_team(id) FROM teams;
END;
$$;

-- 7. Triggers.

-- New votes: apply each new match to the voter's ratings and their teams'.
-- Statement-level, so the two votes of a pair (inserted together) are seen
-- together and the match is applied once.
CREATE FUNCTION public.elo_on_votes_inserted() RETURNS trigger
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

-- Deleted or edited votes: replay the affected users and their teams.
CREATE FUNCTION public.elo_on_votes_changed() RETURNS trigger
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
  RETURN NULL;
END;
$$;

-- Someone joined or left a team: replay that team.
CREATE FUNCTION public.elo_on_memberships_changed() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_team_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    FOR v_team_id IN SELECT DISTINCT team_id FROM new_rows WHERE team_id IS NOT NULL LOOP
      PERFORM elo_rebuild_team(v_team_id);
    END LOOP;
  ELSIF TG_OP = 'DELETE' THEN
    FOR v_team_id IN SELECT DISTINCT team_id FROM old_rows WHERE team_id IS NOT NULL LOOP
      PERFORM elo_rebuild_team(v_team_id);
    END LOOP;
  ELSE
    FOR v_team_id IN
      SELECT team_id FROM old_rows WHERE team_id IS NOT NULL
      UNION
      SELECT team_id FROM new_rows WHERE team_id IS NOT NULL
    LOOP
      PERFORM elo_rebuild_team(v_team_id);
    END LOOP;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER elo_votes_inserted
  AFTER INSERT ON public."Votes"
  REFERENCING NEW TABLE AS new_votes
  FOR EACH STATEMENT EXECUTE FUNCTION public.elo_on_votes_inserted();

CREATE TRIGGER elo_votes_deleted
  AFTER DELETE ON public."Votes"
  REFERENCING OLD TABLE AS old_votes
  FOR EACH STATEMENT EXECUTE FUNCTION public.elo_on_votes_changed();

CREATE TRIGGER elo_votes_updated
  AFTER UPDATE ON public."Votes"
  REFERENCING OLD TABLE AS old_votes NEW TABLE AS new_votes
  FOR EACH STATEMENT EXECUTE FUNCTION public.elo_on_votes_changed();

CREATE TRIGGER elo_memberships_inserted
  AFTER INSERT ON public."TeamMemberships"
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.elo_on_memberships_changed();

CREATE TRIGGER elo_memberships_deleted
  AFTER DELETE ON public."TeamMemberships"
  REFERENCING OLD TABLE AS old_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.elo_on_memberships_changed();

CREATE TRIGGER elo_memberships_updated
  AFTER UPDATE ON public."TeamMemberships"
  REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.elo_on_memberships_changed();

-- Internal functions aren't callable through the API. (Triggers don't need the
-- grant.) Supabase grants EXECUTE on new functions to anon and authenticated.
REVOKE EXECUTE ON FUNCTION
  public.elo_record_match(uuid, uuid, uuid, uuid),
  public.elo_replay(uuid[]),
  public.elo_rebuild_user(uuid),
  public.elo_rebuild_team(uuid),
  public.elo_rebuild_all(),
  public.elo_on_votes_inserted(),
  public.elo_on_votes_changed(),
  public.elo_on_memberships_changed()
FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.my_elo_leaderboards() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_elo_leaderboards() TO authenticated;

-- 8. Voting no longer knows about teams. p_team_id stays (and is ignored) so
-- the app that's deployed while this runs keeps working; a later migration can
-- drop it. vote_beta wrote to the old team_elo and isn't used any more.

DROP FUNCTION IF EXISTS public.vote_beta(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS public.vote(uuid, uuid, uuid);

CREATE FUNCTION public.vote(
  p_winner_id uuid,
  p_loser_id uuid,
  p_team_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_winner_vote_id uuid := gen_random_uuid();
  v_loser_vote_id uuid := gen_random_uuid();
BEGIN
  IF p_winner_id IS NULL OR p_loser_id IS NULL THEN
    RAISE EXCEPTION 'Winner and loser IDs are required';
  END IF;
  IF p_winner_id = p_loser_id THEN
    RAISE EXCEPTION 'Winner and loser must be different names';
  END IF;

  INSERT INTO "Votes" (id, name_id, user_id, vote_type, linked_vote) VALUES
    (v_winner_vote_id, p_winner_id, auth.uid(), 'up', v_loser_vote_id),
    (v_loser_vote_id, p_loser_id, auth.uid(), 'down', v_winner_vote_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.vote(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vote(uuid, uuid, uuid) TO authenticated;

-- 9. Backfill: replay every user's and every team's votes.

SELECT public.elo_rebuild_all();

COMMIT;
