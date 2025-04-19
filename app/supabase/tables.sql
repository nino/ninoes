create table public."Names" (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  name character varying not null,
  constraint Names_pkey primary key (id),
  constraint Names_name_key unique (name)
) TABLESPACE pg_default;

create table public."TeamMemberships" (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  team_id uuid null,
  user_id uuid null,
  constraint TeamMemberships_pkey primary key (id),
  constraint TeamMemberships_team_id_fkey foreign KEY (team_id) references teams (id) on update CASCADE on delete CASCADE,
  constraint TeamMemberships_user_id_fkey foreign KEY (user_id) references auth.users (id) on update CASCADE on delete CASCADE
) TABLESPACE pg_default;

create table public."Users" (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  name character varying not null,
  constraint Users_pkey primary key (id),
  constraint Users_id_fkey foreign KEY (id) references auth.users (id) on update CASCADE on delete CASCADE
) TABLESPACE pg_default;

create table public."Votes" (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  name_id uuid not null,
  user_id uuid not null,
  vote_type public.vote_type not null,
  constraint Votes_pkey primary key (id),
  constraint Votes_name_id_fkey foreign KEY (name_id) references "Names" (id) on update CASCADE on delete CASCADE,
  constraint Votes_user_id_fkey foreign KEY (user_id) references auth.users (id) on update CASCADE on delete CASCADE,
  constraint Votes_user_id_fkey1 foreign KEY (user_id) references "Users" (id) on update CASCADE on delete CASCADE
) TABLESPACE pg_default;

create table public.team_elo (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  team_id uuid not null,
  name_id uuid not null,
  elo double precision null,
  updated_at timestamp with time zone null,
  constraint team_elo_pkey primary key (id),
  constraint team_elo_team_id_name_id_key unique (team_id, name_id),
  constraint team_elo_name_id_fkey foreign KEY (name_id) references "Names" (id) on update CASCADE on delete CASCADE,
  constraint team_elo_team_id_fkey foreign KEY (team_id) references teams (id) on update CASCADE on delete CASCADE
) TABLESPACE pg_default;

create table public.teams (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  creator uuid null,
  name character varying null,
  constraint Teams_pkey primary key (id),
  constraint teams_creator_fkey foreign KEY (creator) references "Users" (id) on update CASCADE on delete CASCADE
) TABLESPACE pg_default;
