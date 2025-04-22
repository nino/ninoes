CREATE TABLE public."Names" (
  id uuid NOT NULL DEFAULT gen_random_uuid (),
  created_at timestamp WITH time zone NOT NULL DEFAULT NOW(),
  updated_at timestamp WITH time zone NOT NULL DEFAULT NOW(),
  name character varying NOT NULL,
  CONSTRAINT Names_pkey PRIMARY KEY (id),
  CONSTRAINT Names_name_key UNIQUE (name)
) TABLESPACE pg_default;

CREATE TABLE public."TeamMemberships" (
  id uuid NOT NULL DEFAULT gen_random_uuid (),
  created_at timestamp WITH time zone NOT NULL DEFAULT NOW(),
  team_id uuid NULL,
  user_id uuid NULL,
  CONSTRAINT TeamMemberships_pkey PRIMARY KEY (id),
  CONSTRAINT TeamMemberships_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams (id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT TeamMemberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON UPDATE CASCADE ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE TABLE public."Users" (
  id uuid NOT NULL DEFAULT gen_random_uuid (),
  created_at timestamp WITH time zone NOT NULL DEFAULT NOW(),
  name character varying NOT NULL,
  CONSTRAINT Users_pkey PRIMARY KEY (id),
  CONSTRAINT Users_id_fkey FOREIGN KEY (id) REFERENCES auth.users (id) ON UPDATE CASCADE ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE TABLE public."Votes" (
  id uuid NOT NULL DEFAULT gen_random_uuid (),
  created_at timestamp WITH time zone NOT NULL DEFAULT NOW(),
  updated_at timestamp WITH time zone NOT NULL DEFAULT NOW(),
  name_id uuid NOT NULL,
  user_id uuid NOT NULL,
  vote_type public.vote_type NOT NULL,
  CONSTRAINT Votes_pkey PRIMARY KEY (id),
  CONSTRAINT Votes_name_id_fkey FOREIGN KEY (name_id) REFERENCES "Names" (id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT Votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT Votes_user_id_fkey1 FOREIGN KEY (user_id) REFERENCES "Users" (id) ON UPDATE CASCADE ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE TABLE public.team_elo (
  id uuid NOT NULL DEFAULT gen_random_uuid (),
  created_at timestamp WITH time zone NOT NULL DEFAULT NOW(),
  team_id uuid NOT NULL,
  name_id uuid NOT NULL,
  elo double precision NULL,
  updated_at timestamp WITH time zone NULL,
  CONSTRAINT team_elo_pkey PRIMARY KEY (id),
  CONSTRAINT team_elo_team_id_name_id_key UNIQUE (team_id, name_id),
  CONSTRAINT team_elo_name_id_fkey FOREIGN KEY (name_id) REFERENCES "Names" (id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT team_elo_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams (id) ON UPDATE CASCADE ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE TABLE public.teams (
  id uuid NOT NULL DEFAULT gen_random_uuid (),
  created_at timestamp WITH time zone NOT NULL DEFAULT NOW(),
  creator uuid NULL,
  name character varying NULL,
  CONSTRAINT Teams_pkey PRIMARY KEY (id),
  CONSTRAINT teams_creator_fkey FOREIGN KEY (creator) REFERENCES "Users" (id) ON UPDATE CASCADE ON DELETE CASCADE
) TABLESPACE pg_default;
