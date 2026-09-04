# Welcome to React Router!

A modern, production-ready template for building full-stack React applications using React Router.

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/remix-run/react-router-templates/tree/main/default)

## Features

- 🚀 Server-side rendering
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization
- 🔄 Data loading and mutations
- 🔒 TypeScript by default
- 🎉 TailwindCSS for styling
- 📖 [React Router docs](https://reactrouter.com/)

## Getting Started

### Installation

Install the dependencies:

```bash
yarn install
```

### Development

Start the development server with HMR:

```bash
yarn dev
```

Your application will be available at `http://localhost:5173`.

## Building for Production

Create a production build:

```bash
yarn build
```

## Database backups

`.github/workflows/supabase-backup.yml` runs every Sunday (and on manual dispatch). It takes a full `pg_dump` of the Supabase database in custom format and uploads it, with a SHA-256 checksum, to a Backblaze B2 bucket.

Required repository secrets:

- `SUPABASE_DB_URL` – session-mode pooler connection string (port 5432) from the Supabase dashboard
- `B2_APPLICATION_KEY_ID` / `B2_APPLICATION_KEY` – Backblaze application key with write access to the bucket
- `B2_BUCKET_NAME` – destination bucket

Optional repository variable `B2_BACKUP_PREFIX` sets the folder inside the bucket (default `supabase`).

Restore with `pg_restore --no-owner --no-privileges -d "$TARGET_DB_URL" supabase-<timestamp>.dump`.

## Deployment

### Docker Deployment

This template includes three Dockerfiles optimized for different package managers:

- `Dockerfile` - for yarn
- `Dockerfile.pnpm` - for pnpm
- `Dockerfile.bun` - for bun

To build and run using Docker:

```bash
# For yarn
docker build -t my-app .

# For pnpm
docker build -f Dockerfile.pnpm -t my-app .

# For bun
docker build -f Dockerfile.bun -t my-app .

# Run the container
docker run -p 3000:3000 my-app
```

The containerized application can be deployed to any platform that supports Docker, including:

- AWS ECS
- Google Cloud Run
- Azure Container Apps
- Digital Ocean App Platform
- Fly.io
- Railway

### DIY Deployment

If you're familiar with deploying Node applications, the built-in app server is production-ready.

Make sure to deploy the output of `yarn build`

```
├── package.json
├── yarn.lock
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use
whatever CSS framework you prefer.

---

Built with ❤️ using React Router.
