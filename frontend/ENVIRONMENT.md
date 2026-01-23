# Environment Variables

This document lists all environment variables required for SurgeonSight.AI frontend.

## Setup

1. Create a `.env` file in the `frontend/` directory
2. Copy the variables below and fill in your values
3. For Vercel deployment, add these in Project Settings → Environment Variables

---

## Required Variables

### ElevenLabs Voice Synthesis
```
VITE_ELEVENLABS_API_KEY=sk_your_elevenlabs_api_key_here
```
Get your API key at: https://elevenlabs.io (Profile → API Keys)

### Overshoot AI Vision Analysis
```
VITE_OVERSHOOT_API_KEY=ovs_your_overshoot_api_key_here
VITE_OVERSHOOT_API_URL=https://cluster1.overshoot.ai/api/v0.2
```
Get your API key at: https://overshoot.ai

---

## Optional Variables

### Backend API (if using separate backend)
```
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

### Feature Flags
```
VITE_ENABLE_MEDIAPIPE=true
VITE_ENABLE_MOCK_MODE=false
```

---

## Vercel Deployment

When deploying to Vercel, add these environment variables in:
1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable with the appropriate value
4. Make sure to select the environments (Production, Preview, Development)

### Important Notes for Vercel:
- All `VITE_` prefixed variables are exposed to the browser
- Do NOT include sensitive backend secrets with `VITE_` prefix
- The API keys (ElevenLabs, Overshoot) are client-side keys and safe to expose
