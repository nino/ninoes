# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is this?

Ninoes is a name voting/ranking app. Users vote on names (up/down and ELO-style head-to-head), view leaderboards, and organize into teams. Built with React Router v7 (SSR) + Supabase + TypeScript.

## Commands

- `pnpm dev` — start dev server with HMR
- `pnpm build` — production build (client + server)
- `pnpm typecheck` — TypeScript type checking
- `pnpm lint` / `pnpm lint:fix` — ESLint
- `pnpm format` — Prettier formatting

No test framework is configured.

## Architecture

- **Framework**: React Router v7 with SSR enabled (`react-router.config.mts`)
- **Database/Auth**: Supabase (PostgreSQL + Auth). No ORM — direct Supabase JS client queries.
- **Data fetching**: All server state through TanStack React Query hooks in `app/hooks/useSupabase.ts`. Data is validated at runtime with Zod schemas from `app/model/types.ts`.
- **Auth flow**: Supabase email/password auth. `app/hooks/useSession.ts` for client-side session. `app/server/guards.server.ts` for server-side route protection.
- **Routing**: Routes defined in `app/routes.ts` (not file-system routing). Auto-generated types in `.react-router/types/`.
- **Path alias**: `~/` maps to `./app/`
- **Styling**: Tailwind CSS v4
- **Error tracking**: Sentry (production only)

## Code Style

- **Prettier**: tabWidth 3, printWidth 89, trailingComma "all"
- **Array types**: Use `Array<T>` not `T[]` (ESLint-enforced)
- **Return types**: All functions must have explicit return type annotations
- **React APIs**: Use `React.useState`, `React.useEffect`, etc. — import React as a namespace, not individual hooks
- **No `any`**: Enforced by ESLint
- **Nullish**: Use `??` and `?.` (ESLint-enforced). Don't use `!!x`.
- **Curly quotes in JSX**: Use HTML entities `&ldquo;` `&rdquo;` `&lsquo;` `&rsquo;` — never raw curly quotes
