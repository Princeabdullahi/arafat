# arafat-telecom-bot

## Folder Structure

- src/
  - config/
  - controllers/
  - middleware/
  - prisma/
  - routes/
  - services/
  - utils/
  - app.ts
  - server.ts
- prisma/
  - schema.prisma

## Run Locally

1. Create `.env` from `.env.example` and fill values.
2. Install:

```bash
npm install
```

3. Generate Prisma client:

```bash
npm run prisma:generate
```

4. Run migrations (dev):

```bash
npm run prisma:migrate:dev
```

5. Start dev server:

```bash
npm run dev
```

## Migrate DB (Production / Railway)

```bash
npm run prisma:migrate
```

## Build

```bash
npm run build
```

## Start

```bash
npm start
```

## WhatsApp Cloud API Webhook Setup

- Set Callback URL to:
  - `https://<your-domain>/webhook`
- Set Verify Token to your `VERIFY_TOKEN`
- Subscribe to `messages` webhook field.

## Test Endpoints

- Health:
  - `GET /health`
- Webhook verify (Meta will call):
  - `GET /webhook?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...`
- Incoming messages:
  - `POST /webhook`

## Railway Deployment

- Add service variables from `.env.example`.
- Set `DATABASE_URL` to your Railway Postgres connection string.
- Deploy.
- Run Prisma migrations:
  - `npm run prisma:migrate`
