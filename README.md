# Docker Compose Setup

This repository uses Docker Compose for local containers:

- `backend`: Laravel on Apache, exposed on port `8000`
- `frontend`: Next.js app on port `3000`
- `postgres`: PostgreSQL on port `5432`

## Quick start

1. Copy the example environment file:

```powershell
Copy-Item .\.env.example .\.env
```

2. Generate a Laravel app key and place it in `.env`:

```powershell
Set-Location .\backend
php artisan key:generate --show
```

3. Build and start the Docker Compose stack:

```powershell
docker compose -f .\docker-compose.yml up --build -d
```

4. Stop the stack when needed:

```powershell
docker compose -f .\docker-compose.yml down
```

## Services

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- PostgreSQL: `localhost:5432`

## Notes

- The backend waits for PostgreSQL, then runs `php artisan migrate --force`.
- Laravel runs behind Apache in the backend container.
- The frontend uses `API_URL=http://backend/api` inside the Docker Compose network.
- Browser requests use `NEXT_PUBLIC_API_URL=http://localhost:8000/api`.
- Build context ignores are defined in `.containerignore`.
- The service build files live at `backend/Dockerfile` and `frontend/Dockerfile`.

## Podman Dev Setup

For live local code changes, use the dev compose file instead of the production-style images:

```powershell
podman compose -f .\docker-compose.dev.yml up --build
```

This dev stack:

- bind-mounts `./backend` and `./frontend` into the containers
- keeps `vendor`, `node_modules`, and `.next` in container volumes
- runs the Next.js dev server so frontend edits update without rebuilding
- runs Laravel from the mounted backend source so PHP changes apply immediately

Use these URLs while developing:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000/api`
- PostgreSQL from host: `localhost:5439`

When you are done:

```powershell
podman compose -f .\docker-compose.dev.yml down
```

## Deployment

Server deployment is handled by [`deploy.sh`](/d:/Flyenv/jewelleryscheme/deploy.sh) and [`.cpanel.yml`](/d:/Flyenv/jewelleryscheme/.cpanel.yml).
