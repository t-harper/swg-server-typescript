.PHONY: help build dev up down logs clean test

# Default target
help:
	@echo "SWG Server - Development Commands"
	@echo ""
	@echo "  make build      - Build production containers"
	@echo "  make dev        - Start development environment with hot reload"
	@echo "  make up         - Start production services"
	@echo "  make down       - Stop all services"
	@echo "  make logs       - View service logs"
	@echo "  make clean      - Remove containers, volumes, and images"
	@echo "  make test       - Run tests in container"
	@echo "  make shell      - Open shell in dev container"
	@echo "  make db-shell   - Open MySQL shell"
	@echo "  make redis-cli  - Open Redis CLI"

# Build production images
build:
	docker-compose -f docker/docker-compose.yml build

# Start development environment
dev:
	docker-compose -f docker/docker-compose.dev.yml up --build

# Start production services
up:
	docker-compose -f docker/docker-compose.yml up -d --build

# Stop all services
down:
	docker-compose -f docker/docker-compose.yml down
	docker-compose -f docker/docker-compose.dev.yml down 2>/dev/null || true

# View logs
logs:
	docker-compose -f docker/docker-compose.yml logs -f

# Clean everything
clean:
	docker-compose -f docker/docker-compose.yml down -v --rmi local
	docker-compose -f docker/docker-compose.dev.yml down -v --rmi local 2>/dev/null || true

# Run tests
test:
	docker-compose -f docker/docker-compose.dev.yml run --rm dev pnpm test

# Open shell in dev container
shell:
	docker-compose -f docker/docker-compose.dev.yml run --rm dev sh

# Open MySQL shell
db-shell:
	docker exec -it swg-mysql mysql -u swg -pswgpass swg

# Open Redis CLI
redis-cli:
	docker exec -it swg-redis redis-cli

# Start only infrastructure (mysql + redis)
infra:
	docker-compose -f docker/docker-compose.yml up -d mysql redis

# Watch mode for development
watch:
	docker-compose -f docker/docker-compose.dev.yml run --rm dev pnpm dev
