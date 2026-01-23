# Backend Environment Variables

## Setup

Create a `.env` file in the `backend/` directory with the following variables:

## Server Configuration

```
# Environment: development | production
ENVIRONMENT=development

# CORS: Comma-separated list of allowed origins for production
# Example: https://surgeonsight.vercel.app,https://www.surgeonsight.ai
ALLOWED_ORIGINS=
```

## LiveKit (Voice/Video)

Get these from your LiveKit Cloud dashboard or self-hosted instance:

```
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
LIVEKIT_URL=wss://your-livekit-server.livekit.cloud
```

## AI/ML Services

```
# Google Gemini API (for video analysis)
GOOGLE_API_KEY=your_google_api_key
```

## Running in Production

### Using Uvicorn directly:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Using Gunicorn (recommended for production):
```bash
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Docker deployment:
See `Dockerfile` in this directory.
