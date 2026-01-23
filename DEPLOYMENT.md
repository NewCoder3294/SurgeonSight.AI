# SurgeonSight.AI Deployment Guide

This guide covers deploying all components of SurgeonSight.AI to production.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Vercel)                       │
│                   Vite + React + TypeScript                 │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ MediaPipe   │  │ ElevenLabs  │  │    Overshoot AI     │ │
│  │ Hand Track  │  │ Voice TTS   │  │   Video Analysis    │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              BACKEND OPTIONS (Choose One)                   │
│                                                             │
│  ┌───────────────────┐     ┌───────────────────────────┐   │
│  │  Python (FastAPI) │     │   Node.js (Express)       │   │
│  │  Railway/Render   │     │   Railway/Render/Vercel   │   │
│  └───────────────────┘     └───────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Frontend Deployment (Vercel)

### Prerequisites
- Vercel account (https://vercel.com)
- GitHub repository connected

### Deploy Steps

1. **Connect Repository**
   ```bash
   cd frontend
   vercel
   ```

2. **Configure Build Settings** (auto-detected for Vite):
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Set Environment Variables** in Vercel Dashboard → Settings → Environment Variables:

   | Variable | Description | Example |
   |----------|-------------|---------|
   | `VITE_ELEVENLABS_API_KEY` | ElevenLabs API key | `sk_xxxxx` |
   | `VITE_OVERSHOOT_API_KEY` | Overshoot AI key | `ovs_xxxxx` |
   | `VITE_OVERSHOOT_API_URL` | Overshoot API URL | `https://cluster1.overshoot.ai/api/v0.2` |
   | `VITE_API_URL` | Backend API URL | `https://api.surgeonsight.ai` |
   | `VITE_WS_URL` | WebSocket URL | `wss://api.surgeonsight.ai` |

4. **Deploy to Production**
   ```bash
   vercel --prod
   ```

### Custom Domain
1. Go to Vercel Dashboard → Project → Settings → Domains
2. Add your domain (e.g., `app.surgeonsight.ai`)
3. Configure DNS records as instructed

---

## 2. Python Backend Deployment (Railway/Render)

### Option A: Railway

1. **Create Railway Project**
   - Go to https://railway.app
   - Create new project from GitHub repo

2. **Configure Service**
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT`

3. **Set Environment Variables**:
   | Variable | Description |
   |----------|-------------|
   | `ENVIRONMENT` | `production` |
   | `ALLOWED_ORIGINS` | `https://app.surgeonsight.ai,https://surgeonsight.vercel.app` |
   | `LIVEKIT_API_KEY` | LiveKit API key |
   | `LIVEKIT_API_SECRET` | LiveKit API secret |
   | `LIVEKIT_URL` | LiveKit WebSocket URL |
   | `GOOGLE_API_KEY` | Google Gemini API key |

### Option B: Render

1. **Create Web Service**
   - Connect GitHub repo
   - Root Directory: `backend`
   - Runtime: Python 3

2. **Build & Start Commands**:
   ```
   Build: pip install -r requirements.txt
   Start: gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
   ```

### Option C: Docker

```bash
cd backend
docker build -t surgeonsight-backend .
docker run -p 8000:8000 --env-file .env surgeonsight-backend
```

---

## 3. Node.js Server Deployment (Optional)

If using the Node.js server instead of Python:

### Railway/Render

1. **Configure Service**
   - Root Directory: `frontend/server`
   - Build Command: `npm install`
   - Start Command: `npm start`

2. **Environment Variables**:
   | Variable | Description |
   |----------|-------------|
   | `NODE_ENV` | `production` |
   | `PORT` | `3001` (or let platform assign) |
   | `CORS_ORIGINS` | `https://app.surgeonsight.ai` |
   | `LIVEKIT_API_KEY` | LiveKit API key |
   | `LIVEKIT_API_SECRET` | LiveKit API secret |
   | `LIVEKIT_URL` | LiveKit WebSocket URL |
   | `OPENAI_API_KEY` | OpenAI API key (for Mastra) |

---

## 4. External Services Setup

### ElevenLabs (Voice Synthesis)
1. Create account at https://elevenlabs.io
2. Go to Profile → API Keys
3. Create new API key
4. Add to frontend: `VITE_ELEVENLABS_API_KEY`

### Overshoot AI (Video Analysis)
1. Create account at https://overshoot.ai
2. Get API key from dashboard
3. Add to frontend: `VITE_OVERSHOOT_API_KEY`

### LiveKit (Real-time Voice/Video)
1. Create account at https://livekit.io
2. Create a new project
3. Get API Key, API Secret, and WebSocket URL
4. Add to backend environment variables

### Google Gemini (AI Analysis)
1. Go to https://makersuite.google.com
2. Create API key
3. Add to backend: `GOOGLE_API_KEY`

---

## 5. Post-Deployment Checklist

- [ ] Verify health endpoint: `https://api.surgeonsight.ai/health`
- [ ] Test CORS from frontend domain
- [ ] Verify WebSocket connections
- [ ] Test ElevenLabs voice synthesis
- [ ] Test Overshoot video analysis
- [ ] Check MediaPipe hand tracking loads
- [ ] Test full coaching session flow
- [ ] Set up monitoring/alerts
- [ ] Configure custom domain SSL

---

## 6. Monitoring & Logging

### Recommended Services
- **Vercel Analytics**: Built-in for frontend
- **Railway/Render Logs**: Built-in for backend
- **Sentry**: Error tracking (add `SENTRY_DSN` to both)
- **LogDNA/Papertrail**: Log aggregation

### Health Checks
- Frontend: `https://app.surgeonsight.ai/` (200 OK)
- Backend: `https://api.surgeonsight.ai/health` (JSON response)

---

## 7. Troubleshooting

### CORS Errors
- Verify `ALLOWED_ORIGINS` includes your frontend domain
- Check for trailing slashes (don't include them)
- Ensure HTTPS on both frontend and backend

### MediaPipe Not Loading
- Verify COOP/COEP headers in `vercel.json`
- Check browser console for SharedArrayBuffer errors

### WebSocket Connection Failed
- Ensure `VITE_WS_URL` uses `wss://` for HTTPS
- Check if backend WebSocket path is `/ws`

### Voice Not Working
- Verify ElevenLabs API key is valid
- Check browser permissions for audio playback
- Ensure HTTPS (required for Web Audio API)
