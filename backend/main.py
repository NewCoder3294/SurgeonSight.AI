from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from baseline import router as baseline_router
from session import router as session_router
from summary import router as summary_router
from store import BASELINE, SESSIONS

app = FastAPI(title="SurgeonSight API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(baseline_router)
app.include_router(session_router)
app.include_router(summary_router)


@app.get("/health")
async def health():
    return {"status": "healthy", "baselines": len(BASELINE), "sessions": len(SESSIONS)}
