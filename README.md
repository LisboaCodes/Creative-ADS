# Multi Ads Platform

> **Centralized dashboard for managing advertising campaigns across multiple platforms**

A comprehensive platform for managing ads across Facebook, Instagram, Google Ads, TikTok, LinkedIn, Twitter, Pinterest, and Snapchat in a single unified dashboard.

## 🚀 Features

### Phase 1 - Core (Current)
- ✅ User authentication (JWT-based)
- ✅ Facebook & Instagram integration via OAuth 2.0
- ✅ Campaign management (pause/activate, budget editing)
- ✅ Real-time metrics dashboard
- ✅ Consolidated multi-platform analytics
- ✅ Automatic campaign synchronization
- ✅ RESTful API with Swagger documentation

### Phase 2 - Planned
- 🔄 Google Ads integration
- 🔄 Automated reports (PDF/Excel)
- 🔄 Smart alerts system
- 🔄 Advanced analytics

### Phase 3 - Planned
- 🔄 TikTok, LinkedIn, Twitter, Pinterest, Snapchat
- 🔄 Client portal (white-label)
- 🔄 Team management & permissions

### Phase 4 - Planned
- 🔄 Budget optimizer with ML
- 🔄 Creative performance tracking
- 🔄 A/B testing framework
- 🔄 CRM & e-commerce integrations

## 🏗️ Tech Stack

### Backend
- **Runtime:** Node.js 20+ with TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL 15+ with Prisma ORM
- **Cache/Queue:** Redis 7+ with Bull
- **Auth:** JWT + OAuth 2.0
- **Validation:** Zod
- **Docs:** Swagger/OpenAPI

### Frontend
- **Framework:** React 18+ with TypeScript
- **Build:** Vite
- **UI:** shadcn/ui + TailwindCSS
- **State:** Zustand + TanStack Query
- **Charts:** Recharts + ApexCharts
- **Forms:** React Hook Form + Zod

### Infrastructure
- **Containerization:** Docker + Docker Compose
- **Database:** PostgreSQL
- **Cache:** Redis
- **Reverse Proxy:** Nginx (production)

## 📋 Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (recommended)

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd CREATIVEADS

# Start all services
docker-compose up -d

# Backend will be available at http://localhost:3000
# Frontend will be available at http://localhost:5173
# API docs at http://localhost:3000/api-docs
```

### Option 2: Manual Setup

#### Backend

```bash
cd backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Start development server
npm run dev
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Start development server
npm run dev
```

## 📖 Documentation

- **API Documentation:** http://localhost:3000/api-docs
- **Installation Guide:** [docs/guides/INSTALLATION.md](docs/guides/INSTALLATION.md)
- **Facebook Setup:** [docs/guides/FACEBOOK_SETUP.md](docs/guides/FACEBOOK_SETUP.md)

## 🔑 Environment Variables

### Backend

Key variables to configure:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/multi_ads_platform"

# JWT Secrets (generate strong random strings)
JWT_SECRET=your-jwt-secret-min-32-characters
JWT_REFRESH_SECRET=your-refresh-secret-min-32-characters

# Encryption Key (exactly 32 characters)
ENCRYPTION_KEY=your-32-character-encryption-k

# Facebook App Credentials
FACEBOOK_APP_ID=your-app-id
FACEBOOK_APP_SECRET=your-app-secret
```

See `.env.example` for complete configuration.

## 📊 Database Schema

The platform uses PostgreSQL with Prisma ORM. Main entities:

- **Users:** Authentication and user management
- **Platforms:** Connected ad platforms (Facebook, Google, etc.)
- **Campaigns:** Ad campaigns from all platforms
- **Metrics:** Performance metrics (impressions, clicks, spend, etc.)
- **Alerts:** Automated alert rules
- **Reports:** Generated reports

Run migrations:
```bash
cd backend
npx prisma migrate dev
```

View database:
```bash
npx prisma studio
```

## 🔐 Authentication

The platform uses JWT-based authentication:

1. **Register/Login:** Get access token + refresh token
2. **Access Token:** Short-lived (15 minutes), used for API requests
3. **Refresh Token:** Long-lived (7 days), used to get new access tokens

Include access token in requests:
```
Authorization: Bearer <access_token>
```

## 🔌 Platform Integrations

### Facebook & Instagram

1. Create a Facebook App at https://developers.facebook.com/
2. Add "Facebook Login" product
3. Configure OAuth redirect URI: `http://localhost:3000/api/platforms/facebook/callback`
4. Request permissions: `ads_management`, `ads_read`, `business_management`
5. Add App ID and Secret to `.env`

See [docs/guides/FACEBOOK_SETUP.md](docs/guides/FACEBOOK_SETUP.md) for detailed instructions.

## 📈 Metrics Calculated

- **CTR (Click-Through Rate):** (Clicks / Impressions) × 100
- **CPC (Cost Per Click):** Spend / Clicks
- **CPM (Cost Per Mille):** (Spend / Impressions) × 1000
- **Conversion Rate:** (Conversions / Clicks) × 100
- **ROAS (Return on Ad Spend):** Revenue / Spend

## 🧪 Testing

```bash
# Backend tests
cd backend
npm run test

# Frontend tests
cd frontend
npm run test
```

## 📦 Production Deployment

### Using Docker Compose

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose exec backend npx prisma migrate deploy
```

### Environment Considerations

- Use strong, randomly generated secrets
- Enable HTTPS (Let's Encrypt recommended)
- Configure CORS for your production domain
- Set up monitoring (Sentry recommended)
- Regular database backups
- Use managed Redis (e.g., Redis Cloud)

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check connection
psql postgresql://postgres:postgres@localhost:5432/multi_ads_platform
```

### Redis Connection Issues

```bash
# Check Redis is running
docker ps | grep redis

# Test connection
redis-cli ping
```

### Migration Issues

```bash
# Reset database (development only!)
cd backend
npx prisma migrate reset

# Force apply migrations
npx prisma migrate deploy --force
```

## 🤝 Contributing

This is currently a private project. Contact the team for contribution guidelines.

## 📄 License

MIT License - See LICENSE file for details

## 📧 Support

For issues or questions:
- Create an issue in the repository
- Contact the development team

## 🗺️ Roadmap

- [x] Phase 1: Core functionality with Facebook/Instagram
- [ ] Phase 2: Google Ads + Reports + Alerts
- [ ] Phase 3: Additional platforms + Team management
- [ ] Phase 4: Advanced features + ML optimization

---

**Version:** 1.0.0
**Last Updated:** 2026-02-09
