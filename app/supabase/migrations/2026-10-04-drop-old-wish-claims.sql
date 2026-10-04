-- Claims moved to public.wish_contributions in 2026-10-04-wish-contributions.sql,
-- and the deployed app no longer reads or writes the old columns. Drop them,
-- along with the functions that wrote them.

BEGIN;

-- The insert policy checked claimed_by, so it has to go before the column.
-- Inserts can't set claim data any more anyway: contributions are a separate
-- table that's only written through contribute_to_wish.
DROP POLICY "Anyone can add wishes" ON public.wishes;
CREATE POLICY "Anyone can add wishes" ON public.wishes
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP FUNCTION public.claim_wish(uuid, text);
DROP FUNCTION public.unclaim_wish(uuid, text);

-- Also drops the wishes_claimed_by_length check constraint.
ALTER TABLE public.wishes
  DROP COLUMN claimed_by,
  DROP COLUMN claimed_at;

COMMIT;
