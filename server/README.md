# Eword Auth Backend

Real account backend for the Eword prototype.

## What it stores

Users are stored in the database table `User`:

- `id`
- `login`
- `name`
- `passwordHash`
- `createdAt`
- `updatedAt`

Passwords are never stored as plain text. The API stores only Argon2id password hashes.

## API flow

1. A user enters name, login, and password in the frontend.
2. The frontend sends registration data to `POST /auth/register`.
3. The backend validates the input, hashes the password with Argon2id, and saves the user in SQLite through Prisma.
4. The backend returns a JWT session token and public user profile.
5. The frontend stores the token in `localStorage` under `eword_auth_session_v2`.
6. On page reload, the frontend calls `GET /auth/me` with `Authorization: Bearer <token>`.
7. If the token is valid, the dashboard opens. If not, the login screen opens.

## Local setup

```bash
cd server
npm install
cp .env.example .env
npm run db:push
npm run seed
npm run dev
```

The API will run at:

```text
http://localhost:3000
```

The seed command creates or updates the demo account from `.env`:

```text
murad / 1234
```

## Endpoints

### Health

```http
GET /health
```

### Register

```http
POST /auth/register
Content-Type: application/json

{
  "name": "Мурад",
  "login": "murad",
  "password": "1234"
}
```

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "login": "murad",
  "password": "1234"
}
```

### Current User

```http
GET /auth/me
Authorization: Bearer <token>
```

## Frontend API URL

By default, the frontend uses:

```text
http://localhost:3000
```

To point the static frontend to a deployed API, run this in the browser console once:

```js
localStorage.setItem("eword_api_url", "https://your-api.example.com");
location.reload();
```

Or edit `eword-config.js` and set `window.EWORD_API_URL` to the deployed backend URL.

## Production notes

- Replace SQLite with a managed PostgreSQL database before real production use.
- Set a long random `JWT_SECRET` in the hosting platform secrets.
- Set `FRONTEND_ORIGIN` to the exact frontend domain instead of `*`.
- Serve the backend only over HTTPS.
