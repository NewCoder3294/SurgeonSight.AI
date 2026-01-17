from fastapi import APIRouter, HTTPException

from schemas import BaselineCreate, BaselineResponse
from store import BASELINE

router = APIRouter()


@router.post("/baseline", response_model=BaselineResponse, status_code=200)
async def save_baseline(baseline: BaselineCreate):
    """Save or overwrite baseline."""
    BASELINE["default"] = {
        "baseline_id": "default",
        "metrics": baseline.metrics,
        "meta": baseline.meta or {},
    }
    return BaselineResponse(**BASELINE["default"])


@router.get("/baseline", response_model=BaselineResponse)
async def get_baseline():
    """Get baseline."""
    if "default" not in BASELINE:
        raise HTTPException(status_code=404, detail="Baseline not found")
    return BaselineResponse(**BASELINE["default"])
