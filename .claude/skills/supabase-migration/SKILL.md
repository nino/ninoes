---
name: supabase-migration
description: Use whenever applying a migration or any other change to the production Supabase database, or taking a database backup. Covers the backup, apply, verify and restore procedure for Ninoes.
---

# Applying migrations to the production Supabase database

## Context

- There is one Supabase project, `Ninoes` (ref `niuinrpiaigbksezupjo`, Postgres 15), used by the live app. There is no staging database, so every migration runs against production.
- Migrations are **not** applied with `supabase db push` or `supabase migration up`. The repo has no `supabase/migrations` directory and the remote migration history table is not used. Migration files live in `app/supabase/migrations/` and are applied one by one with `psql`.
- The Supabase CLI must be linked: `supabase link --project-ref niuinrpiaigbksezupjo`. Link state is stored in `supabase/.temp/`, which is gitignored.
- Docker is not installed, so `supabase db dump` cannot run its own pg_dump. Instead, `supabase db dump --linked --dry-run` prints the pg_dump script it would run. That script includes a temporary login role (`cli_login_postgres`) and a password, which the CLI creates through the Management API. Pipe the script to bash with Homebrew's `postgresql@17` binaries on `PATH`:
   - Install with `brew install postgresql@17` if it is missing.
   - It is keg-only, so add `$(brew --prefix postgresql@17)/bin` to `PATH`.
   - pg_dump 17 can dump the Postgres 15 server.
- The generated scripts contain a temporary password. Write them to a temporary directory, never into the repo, never print them, and delete them straight after use.
- The user's shell is zsh, which does not word-split unquoted variables. Quote variables and do not rely on word-splitting. The snippets below are written to work in both bash and zsh.

## Procedure

### 1. Ask before touching production

Applying a migration changes the live database. Get the user's explicit go-ahead for that specific migration before running anything against it.

### 2. Back up first, every time

Back up into `~/code-friends/ninoes-backups/<YYYY-MM-DD>-before-<what>/`. This is outside the repo because it contains user data; never commit it. Take three files, following Supabase's documented backup procedure:

```bash
OUT=~/code-friends/ninoes-backups/2026-10-04-before-example
SCR=$(mktemp -d)
mkdir -p "$OUT"
export PATH="$(brew --prefix postgresql@17)/bin:$PATH"
dump() { local out=$1; shift
  supabase db dump --linked --dry-run "$@" 2>/dev/null > "$SCR/script.sh"
  bash "$SCR/script.sh" > "$OUT/$out"; rm -f "$SCR/script.sh"
  echo "$out: $(wc -c < "$OUT/$out") bytes"; }
dump roles.sql --role-only
dump schema.sql
dump data.sql --data-only --use-copy
```

Check the backup before going further:

- All three files are non-empty.
- `schema.sql` contains the expected `CREATE TABLE IF NOT EXISTS "public".` lines.
- `data.sql` has `COPY` blocks for the public tables. To count rows for a table, count the lines between its `COPY "public"."<table>"` line and the `\.` terminator, for example with awk.

A warning about circular foreign keys on `Votes` is expected and harmless: `data.sql` starts with `SET session_replication_role = replica;`.

### 3. Write the migration

- Add a file to `app/supabase/migrations/` named `YYYY-MM-DD-description.sql`.
- Wrap it in `BEGIN; … COMMIT;`.
- Update `app/supabase/tables.sql`, the hand-kept schema reference, to match.

### 4. Apply it

Apply with psql as the `postgres` role. The connection's role option is ignored through the pooler, so run `SET ROLE postgres` explicitly in the same session. Without it you get `permission denied for schema public`.

```bash
SCR=$(mktemp -d)
export PATH="$(brew --prefix postgresql@17)/bin:$PATH"
supabase db dump --linked --dry-run 2>/dev/null | grep '^export PG' > "$SCR/env.sh"
source "$SCR/env.sh"; rm -f "$SCR/env.sh"
psql -X -v ON_ERROR_STOP=1 -c "SET ROLE postgres" -f app/supabase/migrations/<file>.sql
```

`ON_ERROR_STOP` together with the transaction means that if any statement fails, nothing is applied.

### 5. Verify

- Run check queries with `-c "SET ROLE postgres"` first. `information_schema` queries return nothing for the CLI login role, because they hide objects that role cannot see.
- Where possible, verify through the app's anon client, since that is what the app uses. This tests grants, RLS policies and RPCs as the app sees them.

### 6. Restore (only if something went wrong)

Only restore with the user's go-ahead.

**A full restore only works into an empty database**, such as a new Supabase project. Don't run the backup files against the live database: `schema.sql` skips tables that already exist (`CREATE TABLE IF NOT EXISTS`), and the `COPY` blocks in `data.sql` then fail on rows that are already there.

To restore everything into a new project, run the three files in order, as in Supabase's "Backup and restore using the CLI" guide:

```bash
psql --single-transaction --variable ON_ERROR_STOP=1 \
  --file roles.sql \
  --file schema.sql \
  --command 'SET session_replication_role = replica' \
  --file data.sql \
  --dbname "<new project's connection string>"
```

On the live database, fix problems in place instead:

- **To undo a migration**, write and apply a reverse migration (dropping what it added, restoring what it changed), following steps 3 to 5.
- **To recover lost rows**, restore the backup into a new project, then copy the rows you need back to the live database.

## Notes

- **Prefer additive, backward-compatible migrations.** The deployed app keeps running against the new schema until the code ships. Code ships on merge to `main`, when `.github/workflows/fly-deploy.yml` deploys to Fly. Drop old columns or functions in a later migration, once nothing uses them.
- **Supabase's default grants.** A new table in `public` is granted to `anon` and `authenticated`. Enable RLS and set grants deliberately. `SECURITY DEFINER` functions should `SET search_path = public`.
- **Clean up test data.** Any test data inserted while checking a migration against production must be deleted afterwards.
