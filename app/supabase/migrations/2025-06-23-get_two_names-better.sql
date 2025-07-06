create or replace function get_two_names_beta(team_id UUID)
returns SETOF "Names"
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  first_name_record "Names"%ROWTYPE;
  first_name_elo INTEGER;
BEGIN
  -- Select the first name using the existing logic
  SELECT "Names".* INTO first_name_record
  FROM public."Names"
  INNER JOIN public."Votes" ON "Names".id = "Votes".name_id
  WHERE NOT EXISTS (
    SELECT id FROM "Votes"
    WHERE "Votes".name_id = "Names".id AND "Votes".vote_type = 'ban'
  )
  GROUP BY "Names".id
  ORDER BY count("Votes".*) ASC, random()
  LIMIT 1;

  -- Get the team_elo for the first name from the team_elo table, defaulting to 1200 if null
  SELECT COALESCE(team_elo.elo, 1200) INTO first_name_elo
  FROM public.team_elo
  WHERE team_elo.team_id = get_two_names_beta.team_id
    AND team_elo.name_id = first_name_record.id;

  -- If no team_elo record exists, default to 1200
  first_name_elo := COALESCE(first_name_elo, 1200);

  -- Return the first name
  RETURN NEXT first_name_record;

  -- Select the second name with closest team_elo to the first name
  RETURN QUERY
  SELECT "Names".*
  FROM public."Names"
  INNER JOIN public."Votes" ON "Names".id = "Votes".name_id
  LEFT JOIN public.team_elo ON team_elo.name_id = "Names".id AND team_elo.team_id = get_two_names_beta.team_id
  WHERE NOT EXISTS (
    SELECT id FROM "Votes"
    WHERE "Votes".name_id = "Names".id AND "Votes".vote_type = 'ban'
  )
  AND "Names".id != first_name_record.id  -- Exclude the first name
  GROUP BY "Names".id, team_elo.elo
  ORDER BY ABS(COALESCE(team_elo.elo, 1200) - first_name_elo) ASC, random()
  LIMIT 1;
END;
$$
