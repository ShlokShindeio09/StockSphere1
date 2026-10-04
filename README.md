# StockSphere — Production MERN Paper Trading App

StockSphere is a scalable educational stock-market application built with **React + Vite**, **Node.js + Express**, and **MongoDB + Mongoose**. It supports paper trading, watchlists, alerts, market data, news, portfolio tracking and account authentication.

## Architecture

```text
Browser
  │
  ▼
Nginx / React SPA (:8080)
  │ /api/*
  ▼
Express API (:5000)
  ├── JWT authentication
  ├── validation + rate limiting
  ├── market endpoints
  ├── paper-trading endpoints
  └── user-specific portfolio/watchlists/alerts
  │
  ▼
MongoDB
```

## Local development

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run seed
npm run dev
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

Demo account after seeding:

- Email: `demo@stocksphere.local`
- Password: `Demo@12345`

Change the demo password for any real deployment.

## Docker deployment

Copy the root environment file and generate a strong secret:

```bash
cp .env.example .env
openssl rand -base64 48
```

Put the generated value in `JWT_SECRET`, then run:

```bash
docker compose up -d --build
```

Open `http://localhost:8080`.

Seed the database once:

```bash
docker compose exec backend npm run seed
```

To load only the bundled stock and news data without deleting users or trading data, use:

```bash
docker compose exec backend npm run seed:market
```

Check service health:

```bash
curl http://localhost:8080/healthz
curl http://localhost:8080/api/healthz
curl http://localhost:8080/api/readyz
```

## Production deployment notes

For a real public deployment, use a managed MongoDB service such as MongoDB Atlas rather than exposing the MongoDB container. Set `MONGODB_URI` to the managed cluster connection string and keep MongoDB credentials in your platform's secret manager.

The backend is stateless: JWT authentication means multiple backend replicas can run behind a load balancer without sticky sessions. For Docker hosts that support Compose scaling, the API can be horizontally scaled with `docker compose up -d --scale backend=3`; in larger deployments, run the backend container on Kubernetes/ECS/Cloud Run behind a managed load balancer. MongoDB indexes and connection pooling are configured for concurrent traffic. Nginx serves immutable frontend assets and proxies `/api` requests.

Recommended production environment variables:

```env
NODE_ENV=production
MONGODB_URI=<managed-mongodb-connection-string>
JWT_SECRET=<long-random-secret>
JWT_EXPIRES_IN=7d
CORS_ORIGINS=https://your-domain.example
RATE_LIMIT_MAX=300
```

Never commit `.env` files or production secrets.

## Scalability

- Stateless Express API for horizontal scaling.
- MongoDB connection pooling.
- Database indexes on user IDs, symbols, email and order timestamps.
- HTTP compression and security headers.
- API rate limiting.
- JSON request size limits.
- Separate frontend and backend containers.
- Docker health checks and graceful shutdown.
- Public market endpoints can be cached at a CDN/reverse proxy.
- Managed MongoDB can be configured for replicas, backups and automatic scaling.

## Important project scope

This is a **paper-trading educational application**. Orders do not connect to a broker and do not place real trades. Market values in the supplied dataset are demonstration data unless you integrate a licensed/authorized market-data provider.
