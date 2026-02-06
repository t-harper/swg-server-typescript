#!/bin/bash
# =============================================================================
# Star Wars Galaxies Server - Health Check Script
# =============================================================================
# Checks if the server is healthy and responding
#
# Usage: healthcheck.sh <server-type> <port>
# =============================================================================

set -e

SERVER_TYPE="${1:-unknown}"
PORT="${2:-0}"

# Health check timeout in seconds
TIMEOUT="${HEALTHCHECK_TIMEOUT:-5}"

# =============================================================================
# Health Check Functions
# =============================================================================

check_tcp_port() {
    local port="$1"
    nc -z -w "$TIMEOUT" localhost "$port" 2>/dev/null
}

check_udp_port() {
    local port="$1"
    # UDP health check is tricky - we check if the port is listening
    # Using ss (socket statistics) to check if port is bound
    ss -uln | grep -q ":${port} " 2>/dev/null
}

check_http_endpoint() {
    local port="$1"
    local path="${2:-/health}"
    curl -sf -m "$TIMEOUT" "http://localhost:${port}${path}" > /dev/null 2>&1
}

check_process() {
    local process_name="$1"
    pgrep -f "$process_name" > /dev/null 2>&1
}

# =============================================================================
# Server-Specific Health Checks
# =============================================================================

check_login_server() {
    local port="${1:-44453}"

    # Check if UDP port is listening
    if ! check_udp_port "$port"; then
        echo "Login server UDP port $port not listening"
        return 1
    fi

    # Check if Node.js process is running
    if ! check_process "login-server"; then
        echo "Login server process not found"
        return 1
    fi

    # Optional: Check HTTP health endpoint if available
    if [ -n "$HEALTH_HTTP_PORT" ]; then
        if ! check_http_endpoint "$HEALTH_HTTP_PORT" "/health"; then
            echo "Login server health endpoint not responding"
            return 1
        fi
    fi

    echo "Login server healthy"
    return 0
}

check_connection_server() {
    local port="${1:-44455}"

    # Check if UDP port is listening
    if ! check_udp_port "$port"; then
        echo "Connection server UDP port $port not listening"
        return 1
    fi

    # Check if Node.js process is running
    if ! check_process "connection-server"; then
        echo "Connection server process not found"
        return 1
    fi

    echo "Connection server healthy"
    return 0
}

check_chat_server() {
    local port="${1:-44462}"

    # Check if TCP port is listening
    if ! check_tcp_port "$port"; then
        echo "Chat server TCP port $port not listening"
        return 1
    fi

    # Check if Node.js process is running
    if ! check_process "chat-server"; then
        echo "Chat server process not found"
        return 1
    fi

    echo "Chat server healthy"
    return 0
}

check_game_server() {
    local port="${1:-44460}"

    # Check if UDP port is listening
    if ! check_udp_port "$port"; then
        echo "Game server UDP port $port not listening"
        return 1
    fi

    # Check if Node.js process is running
    if ! check_process "game-server"; then
        echo "Game server process not found"
        return 1
    fi

    # Optional: Check memory usage isn't excessive
    local mem_usage
    mem_usage=$(ps -o %mem= -p $(pgrep -f "game-server" | head -1) 2>/dev/null | tr -d ' ')
    if [ -n "$mem_usage" ]; then
        # Alert if memory usage exceeds 90%
        mem_int=${mem_usage%.*}
        if [ "${mem_int:-0}" -gt 90 ]; then
            echo "Game server memory usage critical: ${mem_usage}%"
            return 1
        fi
    fi

    echo "Game server healthy"
    return 0
}

# =============================================================================
# Main
# =============================================================================

case "$SERVER_TYPE" in
    login-server|login)
        check_login_server "$PORT"
        ;;
    connection-server|connection)
        check_connection_server "$PORT"
        ;;
    chat-server|chat)
        check_chat_server "$PORT"
        ;;
    game-server|game)
        check_game_server "$PORT"
        ;;
    *)
        echo "Unknown server type: $SERVER_TYPE"
        echo "Usage: healthcheck.sh <login-server|connection-server|chat-server|game-server> <port>"
        exit 1
        ;;
esac
