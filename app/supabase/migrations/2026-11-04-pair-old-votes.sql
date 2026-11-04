-- Pair up old head-to-head votes that elo_matches leaves out.
--
-- Until April 2025 the client wrote the up and the down vote of a head-to-head
-- in two separate inserts, so their created_at differ by a few milliseconds.
-- elo_matches only pairs votes without linked_vote when their created_at are
-- identical, so these votes count towards no rating.
--
-- This sets linked_vote on both votes of each pair, the way `vote` does today.
-- Pairs are matched one-to-one, nearest in time first: same user, one up and
-- one down vote, different names, at most 1 second apart. Only votes that are
-- unpaired today are touched, so every existing match stays as it is.
--
-- Why 1 second: on 2026-11-04 there were 16,322 unpaired votes (all from
-- 2025-03-02 to 2025-04-19). 99.97% have an opposite vote within 1 s (median
-- 5 ms), while one user's successive head-to-heads are at least ~1.3 s apart
-- (1st percentile). That pairs 8,158 head-to-heads and leaves 6 votes alone.
--
-- It's one UPDATE statement, so the elo_votes_updated trigger fires once and
-- replays the affected users and their teams from scratch.

BEGIN;

CREATE TEMP TABLE unpaired_votes ON COMMIT DROP AS
SELECT v.id, v.user_id, v.name_id, v.vote_type, v.created_at
FROM public."Votes" v
WHERE v.vote_type IN ('up', 'down')
  AND v.linked_vote IS NULL
  -- The old client stopped writing separate inserts long before linked_vote.
  AND v.created_at < '2025-07-10'
  AND NOT EXISTS (SELECT 1 FROM public.elo_matches m WHERE m.id = v.id)
  AND NOT EXISTS (SELECT 1 FROM public.elo_matches m WHERE m.loser_vote_id = v.id);

CREATE INDEX ON unpaired_votes (user_id, vote_type, created_at);
ANALYZE unpaired_votes;

CREATE TEMP TABLE vote_pairs (
  up_id uuid NOT NULL UNIQUE,
  down_id uuid NOT NULL UNIQUE,
  gap interval NOT NULL
) ON COMMIT DROP;

-- Greedy one-to-one matching: take candidate pairs closest first, skipping any
-- whose up or down vote is already used.
DO $$
DECLARE
  threshold CONSTANT interval := interval '1 second';
  c record;
BEGIN
  FOR c IN
    SELECT u.id AS up_id, d.id AS down_id, abs_gap AS gap
    FROM unpaired_votes u
    JOIN unpaired_votes d
      ON d.user_id = u.user_id
     AND d.vote_type = 'down'
     AND d.name_id <> u.name_id
     AND d.created_at BETWEEN u.created_at - threshold AND u.created_at + threshold
    CROSS JOIN LATERAL (
      SELECT greatest(d.created_at - u.created_at, u.created_at - d.created_at) AS abs_gap
    ) g
    WHERE u.vote_type = 'up'
    ORDER BY abs_gap, u.created_at, u.id, d.id
  LOOP
    INSERT INTO vote_pairs (up_id, down_id, gap)
    VALUES (c.up_id, c.down_id, c.gap)
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

UPDATE public."Votes" v
SET linked_vote = p.partner
FROM (
  SELECT up_id AS id, down_id AS partner FROM vote_pairs
  UNION ALL
  SELECT down_id, up_id FROM vote_pairs
) p
WHERE v.id = p.id
  AND v.linked_vote IS NULL;

-- Every new pair must now be a match.
DO $$
DECLARE
  v_pairs int;
  v_matched int;
BEGIN
  SELECT count(*) INTO v_pairs FROM vote_pairs;
  SELECT count(*) INTO v_matched
  FROM vote_pairs p
  JOIN public.elo_matches m ON m.id = p.up_id AND m.loser_vote_id = p.down_id;
  IF v_matched <> v_pairs THEN
    RAISE EXCEPTION 'Expected % new matches, found %', v_pairs, v_matched;
  END IF;
  RAISE NOTICE 'Paired % old head-to-head votes', v_pairs;
END;
$$;

COMMIT;
