# Star Wars Galaxies Server - Docker Deployment

This directory contains the Docker deployment configuration for the Star Wars Galaxies server infrastructure.

## Quick Start

### Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 8GB RAM available
- 20GB disk space

### Development Environment

1. Copy the environment file:
   ```bash
   cp .env.example .env
   ```

2. Start the development stack:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml up
   ```

3. Access development tools:
   - Adminer (Database UI): http://localhost:8080
   - Redis Commander: http://localhost:8081

### Production Environment

1. Create secrets directory and files:
   ```bash
   mkdir -p secrets
   echo "your_secure_mysql_root_password" > secrets/mysql_root_password.txt
   echo "your_secure_mysql_password" > secrets/mysql_password.txt
   echo "your_secure_redis_password" > secrets/redis_password.txt
   chmod 600 secrets/*.txt
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

3. Start the production stack:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

## Architecture

```
                                    +----------------+
                                    |    Players     |
                                    +-------+--------+
                                            |
                    +-----------------------+-----------------------+
                    |                       |                       |
            +-------v--------+      +-------v--------+      +-------v--------+
            | Login Server   |      | Connection     |      | Game Server    |
            | Port: 44453/udp|      | Server         |      | Port: 44460/udp|
            +-------+--------+      | Port: 44455/udp|      +-------+--------+
                    |               +-------+--------+              |
                    |                       |                       |
                    +-----------+-----------+-----------+-----------+
                                |                       |
                        +-------v--------+      +-------v--------+
                        |    MySQL       |      |    Redis       |
                        |    Port: 3306  |      |    Port: 6379  |
                        +----------------+      +----------------+
```

## Services

### Infrastructure

| Service | Port | Description |
|---------|------|-------------|
| MySQL | 3306 | Database for player accounts, characters, and game data |
| Redis | 6379 | Session storage, caching, and pub/sub messaging |

### Game Servers

| Service | Port | Description |
|---------|------|-------------|
| Login Server | 44453/udp | Handles player authentication |
| Connection Server | 44455/udp | Routes players to game servers |
| Chat Server | 44462/tcp | Manages chat, mail, and messaging |
| Game Server | 44460/udp | Game world simulation (scalable) |

## Configuration

### Environment Variables

Key environment variables (see `.env.example` for full list):

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `MYSQL_PASSWORD` | MySQL user password | - |
| `REDIS_PASSWORD` | Redis authentication | - |
| `SERVER_NAME` | Display name for server | `My SWG Server` |
| `LOG_LEVEL` | Logging verbosity | `info` |
| `GAME_SERVER_REPLICAS` | Number of game server instances | `1` |

### Resource Limits (Production)

The production configuration includes resource limits:

| Service | CPU Limit | Memory Limit |
|---------|-----------|--------------|
| MySQL | 2 cores | 4GB |
| Redis | 1 core | 1GB |
| Login Server | 1 core | 1GB |
| Connection Server | 1 core | 1GB |
| Chat Server | 1 core | 1GB |
| Game Server | 2 cores | 4GB |

## Scaling

### Scaling Game Servers

To run multiple game server instances:

```bash
# Using docker-compose
docker compose up -d --scale game-server=3

# Or set in .env
GAME_SERVER_REPLICAS=3
```

Each game server instance handles a portion of the game world or specific zones.

### Horizontal Scaling Considerations

1. **Session Affinity**: Players must connect to the same game server instance
2. **State Synchronization**: Use Redis for shared state between instances
3. **Load Balancing**: Connection server routes players to appropriate instances

## Volumes

### Development

Development volumes mount source code for hot reload:
- `./data/mysql` - MySQL data persistence
- `./data/redis` - Redis data persistence
- `./data/logs/*` - Server logs

### Production

Production uses named Docker volumes:
- `mysql_data` - Database files
- `redis_data` - Redis persistence
- `*_logs` - Log files for each server

## Health Checks

All services include health checks for orchestration:

```bash
# Check service health
docker compose ps

# View health check logs
docker inspect --format='{{json .State.Health}}' swg-login-server
```

## Logs

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f login-server

# Last 100 lines
docker compose logs --tail=100 game-server
```

### Log Locations

Inside containers, logs are written to `/app/logs/`.

Production logging uses JSON format with rotation:
- Max file size: 100MB (200MB for game server)
- Max files: 5 (10 for game server)

## Troubleshooting

### Services Won't Start

1. Check dependencies are healthy:
   ```bash
   docker compose ps
   ```

2. View startup logs:
   ```bash
   docker compose logs --tail=50 <service-name>
   ```

3. Check port conflicts:
   ```bash
   netstat -tulpn | grep -E '44453|44455|44460|44462|3306|6379'
   ```

### Database Connection Issues

1. Verify MySQL is healthy:
   ```bash
   docker compose exec mysql mysqladmin ping -h localhost
   ```

2. Check credentials in environment:
   ```bash
   docker compose config | grep -A5 mysql
   ```

### Memory Issues

1. Check container memory usage:
   ```bash
   docker stats
   ```

2. Increase limits in `docker-compose.prod.yml` if needed.

### Network Issues

1. Inspect network:
   ```bash
   docker network inspect docker_swg-network
   ```

2. Test connectivity between containers:
   ```bash
   docker compose exec login-server ping mysql
   ```

## Backup and Restore

### Database Backup

```bash
# Backup
docker compose exec mysql mysqldump -u root -p swgemu > backup.sql

# Restore
docker compose exec -T mysql mysql -u root -p swgemu < backup.sql
```

### Redis Backup

Redis uses AOF persistence. Backup the volume:

```bash
docker run --rm -v docker_redis_data:/data -v $(pwd):/backup alpine \
  tar cvf /backup/redis-backup.tar /data
```

## Security Recommendations

1. **Change default passwords** - Update all passwords in `.env`
2. **Use Docker secrets** - Store sensitive data in secret files
3. **Network isolation** - Only expose necessary ports
4. **Regular updates** - Keep base images updated
5. **Log monitoring** - Set up centralized logging
6. **Firewall rules** - Restrict access to game ports

## Development

### Building Images

```bash
# Build all images
docker compose build

# Build specific image
docker compose build login-server

# Build with no cache
docker compose build --no-cache
```

### Debugging

Development mode exposes debug ports:
- Login Server: 9229
- Connection Server: 9230
- Chat Server: 9231
- Game Server: 9232

Attach debugger:
```bash
# VS Code launch.json
{
  "type": "node",
  "request": "attach",
  "name": "Attach to Login Server",
  "port": 9229,
  "remoteRoot": "/app"
}
```

### Running Tests

```bash
# Run tests inside container
docker compose exec login-server pnpm test

# Run all tests
docker compose run --rm login-server pnpm test
```

## Maintenance

### Updating Images

```bash
# Pull latest base images
docker compose pull

# Rebuild with updates
docker compose build --pull

# Restart with new images
docker compose up -d --force-recreate
```

### Cleaning Up

```bash
# Stop and remove containers
docker compose down

# Also remove volumes (WARNING: deletes data)
docker compose down -v

# Remove unused images
docker image prune -f

# Full cleanup
docker system prune -a --volumes
```

## Support

For issues and feature requests, please open an issue on the project repository.
