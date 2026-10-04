-- Machine translations for the wishlist. Each wish keeps the text as written
-- plus a translation into the other of English/German. `language` is the
-- detected source language; NULL means the wish still needs translating.

BEGIN;

ALTER TABLE public.wishes
  ADD COLUMN language text NULL CHECK (language IN ('en', 'de')),
  ADD COLUMN translated_title text NULL,
  ADD COLUMN translated_description text NULL,
  -- Anyone can add wishes and every one gets sent for translation, so keep
  -- them a sensible size.
  ADD CONSTRAINT wishes_title_length CHECK (length(title) <= 200),
  ADD CONSTRAINT wishes_description_length CHECK (length(description) <= 2000);

-- Editing the text makes the old translation wrong, so drop it and let the
-- translate action pick the wish up again.
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
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER wishes_clear_stale_translation
  BEFORE UPDATE ON public.wishes
  FOR EACH ROW EXECUTE FUNCTION public.wishes_clear_stale_translation();

-- The translate action runs with the anon key like everything else here.
GRANT UPDATE (language, translated_title, translated_description)
  ON public.wishes TO anon, authenticated;

COMMIT;
