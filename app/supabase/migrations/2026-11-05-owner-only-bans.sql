-- Only Nino and Katherine can ban names. A ban takes a name out of the vote for
-- everyone, so other voters can vote names up and down but not ban them.
-- Every ban so far was cast by one of the two, so nothing needs cleaning up.
-- The IDs match BAN_USER_IDS in app/utils/name-bans.ts.
--
-- Restrictive, so it applies on top of the existing insert policies. It covers
-- inserts and updates only: everyone still reads every ban, which is how the
-- vote leaves banned names out.
BEGIN;

CREATE POLICY "Only Nino and Katherine can ban names" ON public."Votes"
  AS RESTRICTIVE FOR INSERT TO public
  WITH CHECK (
    vote_type <> 'ban'
    OR (SELECT auth.uid()) IN (
      'ac3d5729-eb82-4983-a532-03dfa7433e11', -- Nino
      'f7d12942-f6ad-4206-a167-01b9cbd8a01d' -- Katherine
    )
  );

CREATE POLICY "Only Nino and Katherine can ban names on update" ON public."Votes"
  AS RESTRICTIVE FOR UPDATE TO public
  USING (true)
  WITH CHECK (
    vote_type <> 'ban'
    OR (SELECT auth.uid()) IN (
      'ac3d5729-eb82-4983-a532-03dfa7433e11', -- Nino
      'f7d12942-f6ad-4206-a167-01b9cbd8a01d' -- Katherine
    )
  );

COMMIT;
