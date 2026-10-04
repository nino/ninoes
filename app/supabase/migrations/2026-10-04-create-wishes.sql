-- Wedding wishlist at /wishlist. There is no auth: visitors type their name and
-- the anon role does everything. Anyone may add, edit and delete wishes, but the
-- claim columns can only change through claim_wish / unclaim_wish, so a claim
-- can only be taken back by the name that made it.

BEGIN;

CREATE TABLE public.wishes (
  id uuid NOT NULL DEFAULT gen_random_uuid (),
  created_at timestamp WITH time zone NOT NULL DEFAULT NOW(),
  updated_at timestamp WITH time zone NOT NULL DEFAULT NOW(),
  title text NOT NULL CHECK (length(trim(title)) > 0),
  description text NULL,
  price numeric(10, 2) NULL CHECK (price >= 0),
  link text NULL CHECK (link ~* '^https?://'),
  claimed_by text NULL,
  claimed_at timestamp WITH time zone NULL,
  CONSTRAINT wishes_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

ALTER TABLE public.wishes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read wishes" ON public.wishes
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can add wishes" ON public.wishes
  FOR INSERT TO anon, authenticated WITH CHECK (claimed_by IS NULL);
CREATE POLICY "Anyone can edit wishes" ON public.wishes
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete wishes" ON public.wishes
  FOR DELETE TO anon, authenticated USING (true);

-- Column-level grants keep claimed_by / claimed_at out of reach of plain
-- inserts and updates.
REVOKE ALL ON public.wishes FROM anon, authenticated;
GRANT SELECT, DELETE ON public.wishes TO anon, authenticated;
GRANT INSERT (title, description, price, link) ON public.wishes TO anon, authenticated;
GRANT UPDATE (title, description, price, link, updated_at) ON public.wishes TO anon, authenticated;

-- Returns true if the wish was free and is now claimed by p_name.
CREATE OR REPLACE FUNCTION public.claim_wish(p_wish_id uuid, p_name text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH claimed AS (
    UPDATE public.wishes
    SET claimed_by = trim(p_name), claimed_at = NOW()
    WHERE id = p_wish_id AND claimed_by IS NULL AND length(trim(p_name)) > 0
    RETURNING id
  )
  SELECT EXISTS (SELECT 1 FROM claimed);
$$;

-- Returns true if p_name held the claim and it has been released.
CREATE OR REPLACE FUNCTION public.unclaim_wish(p_wish_id uuid, p_name text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH released AS (
    UPDATE public.wishes
    SET claimed_by = NULL, claimed_at = NULL
    WHERE id = p_wish_id AND lower(claimed_by) = lower(trim(p_name))
    RETURNING id
  )
  SELECT EXISTS (SELECT 1 FROM released);
$$;

GRANT EXECUTE ON FUNCTION public.claim_wish(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.unclaim_wish(uuid, text) TO anon, authenticated;

COMMIT;
