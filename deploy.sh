#!/bin/bash
set -Eeuo pipefail

BRANCH="${1:-main}"
SERVICE="${2:-all}"
APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
HEALTH_RETRIES="${HEALTH_RETRIES:-30}"
HEALTH_SLEEP="${HEALTH_SLEEP:-5}"

log() {
  printf '[deploy] %s\n' "$1"
}

fail() {
  printf '[deploy] ERROR: %s\n' "$1" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

docker_compose() {
  docker compose -f "$COMPOSE_FILE" "$@"
}

ensure_repo_ready() {
  [ -d "$APP_DIR/.git" ] || fail "APP_DIR is not a git repository: $APP_DIR"
  cd "$APP_DIR"

  if [ ! -f .env ]; then
    log "Creating .env from .env.example"
    cp .env.example .env
  else
    log "Using existing .env"
  fi
}

update_code() {
  log "Fetching latest code"
  git fetch origin
  git checkout "$BRANCH"
  git pull --ff-only origin "$BRANCH"
}

get_container_health() {
  local container_name="$1"
  docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}running{{end}}' "$container_name" 2>/dev/null || echo missing
}

wait_for_containers() {
  local containers=("$@")
  local attempt=1

  log "Waiting for containers to become healthy"

  while [ "$attempt" -le "$HEALTH_RETRIES" ]; do
    local all_ready=true

    for container in "${containers[@]}"; do
      local status
      status="$(get_container_health "$container")"
      printf '[deploy] health %s=%s\n' "$container" "$status"

      if [ "$status" != "healthy" ] && [ "$status" != "running" ]; then
        all_ready=false
      fi
    done

    if [ "$all_ready" = true ]; then
      log "Containers are ready"
      return 0
    fi

    if [ "$attempt" -eq "$HEALTH_RETRIES" ]; then
      docker_compose ps || true
      fail "Health check failed after $((HEALTH_RETRIES * HEALTH_SLEEP)) seconds"
    fi

    attempt=$((attempt + 1))
    sleep "$HEALTH_SLEEP"
  done
}

run_backend_post_deploy() {
  log "Running Laravel post-deploy commands"
  docker_compose exec -T backend php artisan migrate --force
  docker_compose exec -T backend php artisan config:clear
  docker_compose exec -T backend php artisan cache:clear
}

deploy_frontend() {
  log "Building frontend image"
  docker_compose build --no-cache frontend
  log "Restarting frontend container"
  docker_compose up -d --no-deps frontend
  wait_for_containers jewelleryscheme-frontend
}

deploy_backend() {
  log "Building backend image"
  docker_compose build --no-cache backend
  log "Restarting backend and nginx containers"
  docker_compose up -d --no-deps backend nginx
  wait_for_containers jewelleryscheme-backend jewelleryscheme-nginx
  run_backend_post_deploy
}

deploy_all() {
  log "Building all images"
  docker_compose build --no-cache
  log "Restarting full stack"
  docker_compose up -d --remove-orphans
  wait_for_containers jewelleryscheme-backend jewelleryscheme-frontend jewelleryscheme-nginx
  run_backend_post_deploy
}

cleanup_images() {
  log "Cleaning dangling Docker images"
  docker image prune -f --filter "dangling=true" >/dev/null || true
}

print_summary() {
  log "Deployment summary"
  docker_compose ps || true
}

main() {
  require_command git
  require_command docker

  ensure_repo_ready
  update_code

  case "$SERVICE" in
    frontend)
      deploy_frontend
      ;;
    backend)
      deploy_backend
      ;;
    all)
      deploy_all
      ;;
    *)
      fail "Invalid service '$SERVICE'. Use one of: frontend, backend, all"
      ;;
  esac

  cleanup_images
  print_summary
  log "Deployment completed successfully"
}

main "$@"
