# Dorm67 Web Setup

## Local development

1. Install dependencies from repo root:
   - `npm install`
2. Configure env files:
   - Copy `client/.env.example` to `client/.env`
   - Copy `server/.env.example` to `server/.env`
3. Start apps:
   - Frontend: `npm run dev:client`
   - Backend: `npm run dev:server`

## Required env variables

### Client (`client/.env`)

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_API_URL` (default: `http://localhost:8080`)

### Server (`server/.env`)

- `PORT` (default: `8080`)
- `CLIENT_ORIGIN` (default: `http://localhost:5173`)
- `OPENAI_API_KEY`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (quoted and escaped with `\\n` in env)
  - Example: `FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"`

## Firebase config files

- Firestore rules: `firestore.rules`
- Storage rules: `storage.rules`
- Firebase config: `firebase.json`
- Project alias: `.firebaserc`

## Deployment

### Vercel (frontend)

- Set root directory to `client`
- Build command: `npm run build`
- Output directory: `dist`
- Include all `VITE_*` env variables
- `client/vercel.json` handles SPA rewrites

### Render (backend)

- Use Docker deploy from `server/`
- Add all server env variables in Render dashboard
- Expose port `8080`
- Optional infra file: `render.yaml`
