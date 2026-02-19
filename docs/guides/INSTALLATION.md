# Installation Guide

This guide will help you set up the Multi Ads Platform on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 20+ and npm 10+
  - Download from: https://nodejs.org/
  - Verify: `node --version` and `npm --version`

- **PostgreSQL** 15+
  - Download from: https://www.postgresql.org/download/
  - Or use Docker (recommended)

- **Redis** 7+
  - Download from: https://redis.io/download
  - Or use Docker (recommended)

- **Git**
  - Download from: https://git-scm.com/

- **Docker & Docker Compose** (recommended)
  - Download from: https://www.docker.com/products/docker-desktop

## Installation Methods

### Method 1: Docker Compose (Recommended)

This is the easiest method as it sets up everything automatically.

#### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd CREATIVEADS
```

#### Step 2: Configure Environment Variables

```bash
# Backend
cd backend
cp .env.example .env
```

Edit `backend/.env` and set:
- `JWT_SECRET` - Generate a strong random string (32+ chars)
- `JWT_REFRESH_SECRET` - Generate another strong random string
- `ENCRYPTION_KEY` - Exactly 32 characters

```bash
# Frontend
cd ../frontend
cp .env.example .env
```

#### Step 3: Start Services

```bash
# From project root
docker-compose up -d
```

This will start:
- PostgreSQL on port 5432
- Redis on port 6379
- Backend API on port 3000
- Frontend on port 5173

#### Step 4: Run Migrations

```bash
docker-compose exec backend npx prisma migrate deploy
```

#### Step 5: Access the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- API Docs: http://localhost:3000/api-docs

### Method 2: Manual Installation

#### Step 1: Install and Setup PostgreSQL

```bash
# Create database
createdb multi_ads_platform

# Or using psql
psql -U postgres
CREATE DATABASE multi_ads_platform;
\q
```

#### Step 2: Install and Start Redis

```bash
# On macOS with Homebrew
brew install redis
brew services start redis

# On Ubuntu
sudo apt-get install redis-server
sudo systemctl start redis

# On Windows - use WSL or Docker
```

#### Step 3: Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Copy and configure .env
cp .env.example .env
# Edit .env file with your database credentials and secrets

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Start development server
npm run dev
```

Backend should now be running on http://localhost:3000

#### Step 4: Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy and configure .env
cp .env.example .env

# Start development server
npm run dev
```

Frontend should now be running on http://localhost:5173

## Verification

### 1. Check Backend Health

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "success": true,
  "message": "Server is healthy",
  "timestamp": "2026-02-09T..."
}
```

### 2. Check Database Connection

```bash
cd backend
npx prisma studio
```

This opens Prisma Studio at http://localhost:5555

### 3. Check Redis Connection

```bash
redis-cli ping
```

Expected response: `PONG`

### 4. Check Frontend

Open http://localhost:5173 in your browser. You should see the login page.

## Common Issues

### Port Already in Use

If ports 3000, 5173, 5432, or 6379 are already in use:

```bash
# Find process using port
# On macOS/Linux
lsof -i :3000

# On Windows
netstat -ano | findstr :3000

# Kill the process or change ports in .env files
```

### Database Connection Failed

```bash
# Check PostgreSQL is running
pg_isready

# Check connection string in backend/.env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/multi_ads_platform"
```

### Prisma Migration Issues

```bash
cd backend

# Reset database (development only - this deletes all data!)
npx prisma migrate reset

# If migrations are out of sync
npx prisma migrate resolve --applied "MIGRATION_NAME"
```

### Redis Connection Failed

```bash
# Check Redis is running
redis-cli ping

# Check REDIS_HOST and REDIS_PORT in backend/.env
```

### Node Modules Issues

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

1. **Set up Facebook integration:** See [FACEBOOK_SETUP.md](./FACEBOOK_SETUP.md)
2. **Create your first user:** Register at http://localhost:5173/register
3. **Connect a platform:** Go to Platforms page and connect Facebook
4. **View campaigns:** Campaigns will sync automatically every 15 minutes

## Development Workflow

### Running in Development Mode

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: View logs (optional)
cd backend
tail -f logs/combined-*.log
```

### Database Management

```bash
# Create a new migration
cd backend
npx prisma migrate dev --name description_of_changes

# View database in GUI
npx prisma studio

# Seed database with test data
npm run prisma:seed
```

### Viewing Queue Jobs

The backend uses Bull for job queues. To view job status:

```bash
# Install Bull Board (optional)
npm install --save-dev bull-board

# Or check logs
tail -f logs/combined-*.log | grep "queue"
```

## Production Deployment

For production deployment:

1. Use `docker-compose.prod.yml` instead
2. Set `NODE_ENV=production`
3. Use strong, randomly generated secrets
4. Enable HTTPS
5. Configure CORS for your production domain
6. Set up monitoring and logging
7. Configure regular database backups

See deployment guide for details.

## Support

If you encounter issues not covered here:

1. Check the main [README.md](../../README.md)
2. Review error logs in `backend/logs/`
3. Check Docker logs: `docker-compose logs -f`
4. Contact the development team

## Useful Commands

```bash
# Stop all Docker services
docker-compose down

# Stop and remove volumes (deletes data!)
docker-compose down -v

# View logs
docker-compose logs -f

# Rebuild containers
docker-compose build --no-cache

# Access backend shell
docker-compose exec backend sh

# Access PostgreSQL
docker-compose exec postgres psql -U postgres multi_ads_platform

# Access Redis CLI
docker-compose exec redis redis-cli
```
