# Dorm67 - Student Life Super-App

Dorm67 is a campus-focused web app for students living in dorms.  
It combines marketplace, social feed, messaging, and AI tools in one product.

---

## What Is Included

- **Marketplace:** create listings, browse items, save posts, mark as sold.
- **Feed:** publish announcements, comment, and interact with campus updates.
- **Chats:** real-time conversations between students and buyers/sellers.
- **Auth + Onboarding:** Firebase Email/Password and Google sign-in with profile setup.
- **AI Assistant:** OpenAI-powered chat with streamed responses and history persistence.
- **Taras AI Tool:** upload template images, extract structure/measurements, generate lab reports, preview and export `.docx`.

---

## Tech Stack

### Client (`/client`)
- React 18 + Vite
- TypeScript
- Tailwind CSS + Radix UI primitives
- Zustand state management
- Firebase Web SDK

### Server (`/server`)
- Node.js + Express
- TypeScript
- Firebase Admin SDK (Firestore access and background listeners)
- OpenAI SDK (assistant/chat)
- Anthropic SDK (Taras workflows)
- AWS S3-compatible object storage (Taras files)

---

## Project Structure

- `client/` - frontend SPA
- `server/` - API server and background workers
- `firestore.indexes.json` - Firestore composite/collection-group indexes

---

## Local Development

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment files

Create and fill:
- `client/.env`
- `server/.env`

### 3) Run apps

```bash
# client
npm run dev:client

# server
npm run dev:server
```

---

## Environment Variables

### Client (`client/.env`)
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_API_URL` (for example `http://localhost:8080`)

### Server (`server/.env`)
- `PORT` (default `8080`)
- `CLIENT_ORIGIN` (default `http://localhost:5173`)
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY` (required for Taras endpoints)
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `S3_REGION`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_PUBLIC_BASE_URL`
- `S3_ENDPOINT` (optional, for S3-compatible providers)
- `TARAS_ANTHROPIC_MODEL` (optional, default `claude-sonnet-4-6`)
- `TARAS_DISABLE_LIMITS` (optional)
- `TARAS_USE_SECTIONED` (optional)
- `TARAS_FORCE_LEGACY` (optional)
- `TARAS_MAX_TOKENS_PER_JOB` (optional)

---

## API Surface (high level)

- `GET /health` - health check
- `POST /api/listings/enhance` - AI enhancement for listing text
- `POST /api/ai/chat` - streamed assistant chat
- `POST /api/ai/taras/*` - Taras upload/analyze/generate/refine/jobs
- `POST /api/upload` - image upload endpoint

---

## Notes

- Taras files are stored under the `aiTaras/...` prefix in S3-compatible storage.
- Firestore indexes may be required for some collection-group queries.  
  Use the error link from Firebase console and keep `firestore.indexes.json` in sync.
- An AI queue listener exists on the server for queued tasks; the main assistant endpoint currently streams directly.

---

## Deployment (typical)

- **Client:** Vercel (root `client/`)
- **Server:** Render (root `server/`)
- **Database/Auth:** Firebase project (Firestore + Auth)

---

## Roadmap

- [ ] Seller ratings and reviews
- [ ] Web push notifications
- [ ] Better moderation and reporting tools
- [ ] Timetable and university system integrations

---

Built for the Dorm67 student community.
