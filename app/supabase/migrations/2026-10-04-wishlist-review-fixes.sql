-- Fixes from reviewing the wishlist:
-- * Concurrent calls to /wishlist/translate all translated the same pending
--   wishes. Pending wishes are now handed out through start_wish_translations,
--   which leases each one to a single run for five minutes.
-- * Claim names had no length limit.

BEGIN;

ALTER TABLE public.wishes
  ADD COLUMN translation_started_at timestamp WITH time zone NULL,
  ADD CONSTRAINT wishes_claimed_by_length CHECK (length(claimed_by) <= 80);

-- Editing the text also ends any lease, so the new text is picked up at once.
CREATE OR REPLACE FUNCTION public.wishes_clear_stale_translation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.title IS DISTINCT FROM OLD.title
     OR NEW.description IS DISTINCT FROM OLD.description THEN
    NEW.language := NULL;
    NEW.translated_title := NULL;
    NEW.translated_description := NULL;
    NEW.translation_started_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Leases up to p_limit (at most 10) pending wishes to the caller and returns
-- them. Wishes another run is working on, or finished, are skipped; a lease
-- that's older than five minutes counts as abandoned (the run crashed or the
-- translation failed) and is handed out again.
CREATE OR REPLACE FUNCTION public.start_wish_translations(p_limit integer)
RETURNS TABLE (id uuid, title text, description text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.wishes AS w
  SET translation_started_at = NOW()
  WHERE w.id IN (
    SELECT p.id
    FROM public.wishes AS p
    WHERE p.language IS NULL
      AND (p.translation_started_at IS NULL
           OR p.translation_started_at < NOW() - interval '5 minutes')
    ORDER BY p.created_at
    LIMIT least(greatest(p_limit, 0), 10)
    FOR UPDATE SKIP LOCKED
  )
  RETURNING w.id, w.title, w.description;
$$;

GRANT EXECUTE ON FUNCTION public.start_wish_translations(integer) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_wish(p_wish_id uuid, p_name text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH claimed AS (
    UPDATE public.wishes
    SET claimed_by = trim(p_name), claimed_at = NOW()
    WHERE id = p_wish_id
      AND claimed_by IS NULL
      AND length(trim(p_name)) BETWEEN 1 AND 80
    RETURNING id
  )
  SELECT EXISTS (SELECT 1 FROM claimed);
$$;

COMMIT;
