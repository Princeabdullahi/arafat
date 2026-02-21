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

## Environment Variables (How to get each value)

Create a `.env` file (copy from `.env.example`) and fill the values below.

### DATABASE_URL

Option A: Railway Postgres (recommended)

1. In Railway, create a **PostgreSQL** database.
2. Open the Postgres service.
3. Go to **Connect**.
4. Copy the connection string labeled **DATABASE_URL** (or the Postgres connection URL).
5. Paste it into your `.env` as `DATABASE_URL=...`.

Option B: Local Postgres

1. Install Postgres locally.
2. Create a database (example: `arafat_telecom_bot`).
3. Use a connection string like:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/arafat_telecom_bot?schema=public"
```

### WHATSAPP_TOKEN

This is your **WhatsApp Cloud API access token**.

1. Go to **Meta for Developers**.
2. Create/select an app.
3. Add the **WhatsApp** product.
4. Go to **WhatsApp > Getting Started**.
5. Copy the **Temporary access token** for testing.
6. For production, set up a **Permanent token** via System User in Business Manager and use that token.
7. Put it in `.env` as `WHATSAPP_TOKEN=...`.

### WHATSAPP_PHONE_NUMBER_ID

1. Go to **Meta for Developers**.
2. Open your app.
3. Go to **WhatsApp > Getting Started**.
4. Find **Phone number ID**.
5. Put it in `.env` as `WHATSAPP_PHONE_NUMBER_ID=...`.

### VERIFY_TOKEN

This is **any secret string you choose**. Meta uses it once when verifying your webhook.

1. Pick a random string (example: `my_verify_token_12345`).
2. Set `.env`:

```bash
VERIFY_TOKEN=my_verify_token_12345
```

3. In Meta webhook configuration, use the exact same value as the **Verify token**.

### JWT_SECRET

This is **any long random secret** used to sign tokens.

Generate one locally:

PowerShell:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then set:

```bash
JWT_SECRET=<paste-generated-value>
```

### WHATSAPP_APP_SECRET

This is used to verify the webhook signature (`x-hub-signature-256`).

1. Go to **Meta for Developers**.
2. Open your app.
3. Go to **Settings > Basic**.
4. Copy the **App Secret**.
5. Set `.env` as `WHATSAPP_APP_SECRET=...`.

Important: keep this secret private.

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
