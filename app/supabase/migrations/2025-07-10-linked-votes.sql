-- Migration: Add linked_vote column and populate with closest opposite votes
-- This migration assumes that for each up/down vote, there should be a corresponding opposite vote

BEGIN;

-- Step 1: Add the linked_vote column
-- ALTER TABLE public."Votes" 
-- ADD COLUMN linked_vote uuid;

-- Step 2: Add foreign key constraint for linked_vote
-- ALTER TABLE public."Votes" 
-- ADD CONSTRAINT Votes_linked_vote_fkey 
-- FOREIGN KEY (linked_vote) REFERENCES public."Votes" (id) 
-- ON UPDATE CASCADE ON DELETE SET NULL;

-- Step 3: Create a temporary function to find and link opposite votes
CREATE OR REPLACE FUNCTION link_opposite_votes() RETURNS void AS $$
DECLARE
    vote_record RECORD;
    opposite_vote_id uuid;
BEGIN
    -- Process all up/down votes that don't already have a linked vote
    FOR vote_record IN 
        SELECT id, created_at, name_id, user_id, vote_type
        FROM public."Votes"
        WHERE vote_type IN ('up', 'down') 
        AND linked_vote IS NULL
        ORDER BY created_at
        LIMIT 10
        OFFSET 0
    LOOP
        -- Find the closest opposite vote in time for the same user
        SELECT v.id INTO opposite_vote_id
        FROM public."Votes" v
        WHERE v.user_id = vote_record.user_id
        AND v.vote_type = CASE 
            WHEN vote_record.vote_type = 'up' THEN 'down'::public.vote_type
            WHEN vote_record.vote_type = 'down' THEN 'up'::public.vote_type
        END
        AND v.id != vote_record.id
        AND v.name_id != vote_record.name_id
        AND v.linked_vote IS NULL  -- Don't link to already linked votes
        ORDER BY ABS(EXTRACT(EPOCH FROM (v.created_at - vote_record.created_at))) ASC
        LIMIT 1;

        -- If we found a matching opposite vote, link them bidirectionally
        IF opposite_vote_id IS NOT NULL THEN
            UPDATE public."Votes" 
            SET linked_vote = opposite_vote_id 
            WHERE id = vote_record.id;

            UPDATE public."Votes" 
            SET linked_vote = vote_record.id 
            WHERE id = opposite_vote_id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Execute the linking function
SELECT link_opposite_votes();

-- Step 5: Clean up the temporary function
DROP FUNCTION link_opposite_votes();

-- Step 6: Add index for performance on the new column
-- CREATE INDEX idx_votes_linked_vote ON public."Votes" (linked_vote);

-- Step 7: Add a check constraint to ensure ban votes don't have linked votes
-- ALTER TABLE public."Votes" 
-- ADD CONSTRAINT check_ban_votes_no_link 
-- CHECK (
--     (vote_type = 'ban' AND linked_vote IS NULL) OR 
--     (vote_type IN ('up', 'down'))
-- );

COMMIT;
