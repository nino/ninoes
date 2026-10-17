# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is this?

Ninoes is mainly a name voting/ranking app. Users vote on names (up/down and ELO-style head-to-head), view leaderboards, and organize into teams. It also hosts a few unrelated pages: a wedding gift wishlist (`/wishlist`), bus times (`/bus`), Star Trek and calendar ICS feeds, and `/control`. Built with React Router v8 (SSR) + Supabase + TypeScript.

## Commands

Bun is the package manager, the runtime (dev server, build and production server) and the test runner. Always go through `bun run <script>`: `bun build` and `bun test` are Bun's own bundler and test runner and skip the package.json scripts.

- `bun run dev` — start dev server with HMR (`.claude/launch.json` runs it on port 5199 with `--strictPort`). The script runs React Router's bin by path because Bun drops `--conditions=development` when it resolves a bin by name, and React Router needs that condition to start in dev mode.
- `bun run build` — production build (client + server)
- `bun run typecheck` — TypeScript type checking
- `bun run lint` / `bun run lint:fix` — oxlint (type-aware; config in `.oxlintrc.json`)
- `bun run format` — Prettier formatting
- `bun run test` — `bun test` with happy-dom and Testing Library, preloaded from `app/test/` (see `bunfig.toml`); test files live next to their subject as `*.test.{ts,tsx}` and import from `bun:test`. Its `vi` covers `fn`, `spyOn` and fake timers but not `stubGlobal`.

CI runs `bun run typecheck`, `bun run lint`, `bun run test` and `bun run build`, in that order. Run the same before pushing.

## Environment

- `.env` (gitignored) must set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; `app/env.ts` fails at startup without them. See `.env.example`.
- The wishlist translation endpoint calls the Claude API. Locally it uses the credentials from `ant auth login`; on Fly it uses workload identity federation (`app/server/anthropic.server.ts`), so there is no API key to set.

## Architecture

- **Framework**: React Router v8 with SSR enabled (`react-router.config.mts`)
- **Database/Auth**: Supabase (PostgreSQL + Auth). No ORM — direct Supabase JS client queries.
- **Data fetching**: All server state through TanStack React Query hooks in `app/hooks/useSupabase.ts`. Data is validated at runtime with Zod schemas from `app/model/types.ts`.
- **Auth flow**: Supabase email/password auth. `app/hooks/useSession.ts` for client-side session. `app/server/guards.server.ts` for server-side route protection.
- **Routing**: Routes defined in `app/routes.ts` (not file-system routing). Auto-generated types in `.react-router/types/`.
- **Path alias**: `~/` maps to `./app/`
- **Styling**: Tailwind CSS v4. Design tokens live in `@theme` in `app/app.css`. Colours like `bg-page`, `bg-card`, `text-fg`, `text-muted-fg`, `border-border` and `bg-primary` are redefined for dark mode there, so use them in place of raw colours. Fonts are `font-sans` (Bricolage Grotesque) and `font-title` (Bevan), loaded from Bunny Fonts in `app/root.tsx`. Shared button, input and card class strings are in `app/components/ui/styles.ts`.
- **Error tracking**: Sentry (production only)

## Deploys and previews

- Merging to `main` deploys to production on Fly (`.github/workflows/fly-deploy.yml`).
- Every PR gets a preview app at `ninoes-pr-<number>.fly.dev` (`.github/workflows/fly-preview.yml`). Previews use the production database, so anything written through a preview is real data.

## Wishlist

- `app/routes/wishlist.tsx` sits outside the app layout, with its own header and favicon. It uses the same design system as the rest of the site.
- German copy addresses guests as "ihr".

## Database migrations

- Migrations are hand-written SQL files in `app/supabase/migrations/`, named `YYYY-MM-DD-description.sql`. Update `app/supabase/tables.sql` (a hand-kept schema reference) alongside each migration.
- There is one shared production database and no staging, so a full backup is taken before every change.
- The backup and apply procedure is in the `supabase-migration` skill (`.claude/skills/supabase-migration/SKILL.md`).

## Code Style

- **Prettier**: tabWidth 3, printWidth 89, trailingComma "all"
- **Array types**: Use `Array<T>` not `T[]` (oxlint-enforced)
- **Return types**: Named functions and components need explicit return types (oxlint-enforced; inline callbacks and typed function expressions are exempt)
- **No `any`**: Enforced by oxlint
- **Nullish**: Use `??` and `?.` (oxlint-enforced). Don't use `!!x`.
- **Curly quotes in JSX**: Use HTML entities `&ldquo;` `&rdquo;` `&lsquo;` `&rsquo;` — never raw curly quotes
