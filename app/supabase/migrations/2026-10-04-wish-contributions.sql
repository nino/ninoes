-- Chipping in: instead of one person claiming a wish, any number of guests can
-- contribute to it. A contribution is either complete ("I'll give this", the
-- old claim) or partial ("chip in"), with an optional amount that everyone can
-- see. Rules, enforced in contribute_to_wish:
--   * a complete contribution is only possible while nobody else contributes,
--     and once it exists nobody else can contribute;
--   * each name has at most one contribution per wish (contributing again
--     replaces it);
--   * only the same name can withdraw it.
-- claimed_by / claimed_at and claim_wish / unclaim_wish stay for now so the
-- deployed code keeps working until this ships; existing claims are copied
-- over as complete contributions.

BEGIN;

CREATE TABLE public.wish_contributions (
  id uuid NOT NULL DEFAULT gen_random_uuid (),
  created_at timestamp WITH time zone NOT NULL DEFAULT NOW(),
  wish_id uuid NOT NULL,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  amount numeric(10, 2) NULL CHECK (amount > 0),
  complete boolean NOT NULL DEFAULT false,
  CONSTRAINT wish_contributions_pkey PRIMARY KEY (id),
  CONSTRAINT wish_contributions_wish_id_fkey FOREIGN KEY (wish_id)
    REFERENCES public.wishes (id) ON UPDATE CASCADE ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE UNIQUE INDEX wish_contributions_wish_name_key
  ON public.wish_contributions (wish_id, lower(name));

ALTER TABLE public.wish_contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read contributions" ON public.wish_contributions
  FOR SELECT TO anon, authenticated USING (true);

-- Writes only go through the functions below.
REVOKE ALL ON public.wish_contributions FROM anon, authenticated;
GRANT SELECT ON public.wish_contributions TO anon, authenticated;

INSERT INTO public.wish_contributions (wish_id, name, complete, created_at)
SELECT id, claimed_by, true, coalesce(claimed_at, NOW())
FROM public.wishes
WHERE claimed_by IS NOT NULL;

-- Returns 'ok', or why the contribution was refused:
--   'invalid'  - empty or over-long name, or a non-positive amount
--   'missing'  - the wish doesn't exist (any more)
--   'taken'    - someone else is giving the whole wish
--   'shared'   - a complete contribution was asked for, but others already
--                contribute
CREATE OR REPLACE FUNCTION public.contribute_to_wish(
  p_wish_id uuid,
  p_name text,
  p_amount numeric,
  p_complete boolean
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text := trim(p_name);
BEGIN
  IF v_name IS NULL OR length(v_name) NOT BETWEEN 1 AND 80
     OR (p_amount IS NOT NULL AND p_amount <= 0) THEN
    RETURN 'invalid';
  END IF;

  -- Serialises contributions per wish, so two guests can't both take it whole.
  PERFORM 1 FROM public.wishes WHERE id = p_wish_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN 'missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.wish_contributions
    WHERE wish_id = p_wish_id AND complete AND lower(name) <> lower(v_name)
  ) THEN
    RETURN 'taken';
  END IF;

  IF p_complete AND EXISTS (
    SELECT 1 FROM public.wish_contributions
    WHERE wish_id = p_wish_id AND lower(name) <> lower(v_name)
  ) THEN
    RETURN 'shared';
  END IF;

  INSERT INTO public.wish_contributions (wish_id, name, amount, complete)
  VALUES (p_wish_id, v_name, p_amount, p_complete)
  ON CONFLICT (wish_id, lower(name)) DO UPDATE
    SET amount = EXCLUDED.amount, complete = EXCLUDED.complete;
  RETURN 'ok';
END;
$$;

-- Returns true if p_name had a contribution on the wish and it's now gone.
CREATE OR REPLACE FUNCTION public.withdraw_wish_contribution(p_wish_id uuid, p_name text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH removed AS (
    DELETE FROM public.wish_contributions
    WHERE wish_id = p_wish_id AND lower(name) = lower(trim(p_name))
    RETURNING id
  )
  SELECT EXISTS (SELECT 1 FROM removed);
$$;

GRANT EXECUTE ON FUNCTION public.contribute_to_wish(uuid, text, numeric, boolean)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_wish_contribution(uuid, text)
  TO anon, authenticated;

COMMIT;
