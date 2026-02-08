#!/bin/bash
# =============================================================================
# Star Wars Galaxies Server - Container Entrypoint Script
# =============================================================================
# This script handles:
# - Waiting for dependent services (MySQL, Redis)
# - Running database migrations
# - Starting the server application
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# =============================================================================
# Wait for Dependencies
# =============================================================================

wait_for_mysql() {
    if [ -z "$DATABASE_HOST" ]; then
        log_info "DATABASE_HOST not set, skipping MySQL wait"
        return 0
    fi

    local host="${DATABASE_HOST}"
    local port="${DATABASE_PORT:-3306}"
    local max_attempts="${MYSQL_WAIT_TIMEOUT:-60}"
    local attempt=1

    log_info "Waiting for MySQL at ${host}:${port}..."

    while [ $attempt -le $max_attempts ]; do
        if nc -z "$host" "$port" 2>/dev/null; then
            log_info "MySQL is available after ${attempt} seconds"
            return 0
        fi

        if [ $((attempt % 10)) -eq 0 ]; then
            log_info "Still waiting for MySQL... (${attempt}/${max_attempts})"
        fi

        sleep 1
        attempt=$((attempt + 1))
    done

    log_error "MySQL not available after ${max_attempts} seconds"
    return 1
}

wait_for_redis() {
    if [ -z "$REDIS_HOST" ]; then
        log_info "REDIS_HOST not set, skipping Redis wait"
        return 0
    fi

    local host="${REDIS_HOST}"
    local port="${REDIS_PORT:-6379}"
    local max_attempts="${REDIS_WAIT_TIMEOUT:-30}"
    local attempt=1

    log_info "Waiting for Redis at ${host}:${port}..."

    while [ $attempt -le $max_attempts ]; do
        if nc -z "$host" "$port" 2>/dev/null; then
            log_info "Redis is available after ${attempt} seconds"
            return 0
        fi

        if [ $((attempt % 10)) -eq 0 ]; then
            log_info "Still waiting for Redis... (${attempt}/${max_attempts})"
        fi

        sleep 1
        attempt=$((attempt + 1))
    done

    log_error "Redis not available after ${max_attempts} seconds"
    return 1
}

wait_for_service() {
    local host="$1"
    local port="$2"
    local name="$3"
    local max_attempts="${4:-30}"
    local protocol="${5:-tcp}"
    local attempt=1

    if [ -z "$host" ] || [ -z "$port" ]; then
        return 0
    fi

    log_info "Waiting for ${name} at ${host}:${port} (${protocol})..."

    while [ $attempt -le $max_attempts ]; do
        if [ "$protocol" = "udp" ]; then
            # UDP "open" checks are best-effort. Prefer a successful probe,
            # but accept DNS-resolvable service names to avoid false negatives.
            if nc -zu -w 1 "$host" "$port" 2>/dev/null || getent hosts "$host" >/dev/null 2>&1; then
                log_info "${name} is available after ${attempt} seconds"
                return 0
            fi
        elif nc -z "$host" "$port" 2>/dev/null; then
            log_info "${name} is available after ${attempt} seconds"
            return 0
        fi

        sleep 1
        attempt=$((attempt + 1))
    done

    log_error "${name} not available after ${max_attempts} seconds"
    return 1
}

# =============================================================================
# Load Secrets from Files
# =============================================================================

load_secrets() {
    # Load database password from secret file if available
    if [ -f "$DATABASE_PASSWORD_FILE" ]; then
        export DATABASE_PASSWORD=$(cat "$DATABASE_PASSWORD_FILE")
        log_info "Loaded database password from secret file"
    fi

    # Load Redis password from secret file if available
    if [ -f "$REDIS_PASSWORD_FILE" ]; then
        export REDIS_PASSWORD=$(cat "$REDIS_PASSWORD_FILE")
        log_info "Loaded Redis password from secret file"
    fi
}

# =============================================================================
# Run Database Migrations
# =============================================================================

run_migrations() {
    if [ "$RUN_MIGRATIONS" = "false" ]; then
        log_info "Skipping migrations (RUN_MIGRATIONS=false)"
        return 0
    fi

    # Only run migrations for servers that need database access
    case "$SERVER_TYPE" in
        login-server|chat-server|game-server)
            if [ -f "/app/scripts/migrate.js" ]; then
                log_info "Running database migrations..."
                node /app/scripts/migrate.js
                log_info "Migrations completed"
            else
                log_info "No migration script found, skipping"
            fi
            ;;
        *)
            log_info "Skipping migrations for ${SERVER_TYPE}"
            ;;
    esac
}

# =============================================================================
# Health Check Registration
# =============================================================================

register_service() {
    if [ -z "$REDIS_HOST" ]; then
        return 0
    fi

    log_info "Registering ${SERVER_TYPE} with service registry..."

    # This would typically register the service in Redis for discovery
    # Implementation depends on your service discovery mechanism
}

# =============================================================================
# Graceful Shutdown
# =============================================================================

shutdown() {
    log_info "Received shutdown signal, gracefully stopping..."

    # Send SIGTERM to the main process
    if [ -n "$MAIN_PID" ]; then
        kill -TERM "$MAIN_PID" 2>/dev/null
        wait "$MAIN_PID"
    fi

    log_info "Server stopped"
    exit 0
}

trap shutdown SIGTERM SIGINT

# =============================================================================
# Main
# =============================================================================

main() {
    log_info "==================================================="
    log_info "Star Wars Galaxies - ${SERVER_TYPE:-Server}"
    log_info "==================================================="
    log_info "Environment: ${NODE_ENV:-development}"
    log_info "Log Level: ${LOG_LEVEL:-info}"

    # Load secrets from files (Docker secrets)
    load_secrets

    # Wait for dependent services
    wait_for_mysql
    wait_for_redis

    # Wait for other internal services if needed
    if [ -n "$CHAT_SERVER_HOST" ] && [ -n "$CHAT_SERVER_PORT" ]; then
        wait_for_service "$CHAT_SERVER_HOST" "$CHAT_SERVER_PORT" "Chat Server" 60 tcp
    fi

    if [ -n "$CONNECTION_SERVER_HOST" ] && [ -n "$CONNECTION_SERVER_PORT" ]; then
        wait_for_service "$CONNECTION_SERVER_HOST" "$CONNECTION_SERVER_PORT" "Connection Server" 60 udp
    fi

    # Run database migrations
    run_migrations

    # Register service for discovery
    register_service

    log_info "Starting ${SERVER_TYPE:-server}..."
    log_info "==================================================="

    # Execute the main command
    exec "$@" &
    MAIN_PID=$!

    # Wait for the main process
    wait "$MAIN_PID"
}

main "$@"
