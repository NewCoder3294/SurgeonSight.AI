"""
SurgeonSight AI - LLM Summary Endpoint

POST /expert/summary
Generates a comprehensive, student-friendly summary of surgical practice session
using Gemini LLM for intelligent analysis.

Input: session_data JSON with metrics, errors, scores, and expert reference
Output: { "summary": "..." } - Human-readable performance report
"""

import os
from typing import Optional, List, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/expert", tags=["summary"])


# ===================================
# Request/Response Models
# ===================================

class ToolEvent(BaseModel):
    """A tool usage event during the session."""
    tool_name: Optional[str] = None
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    target_region: Optional[str] = None
    angle_deviation_degrees: Optional[float] = None
    position_error_mm: Optional[float] = None
    depth_error_mm: Optional[float] = None


class ErrorEvent(BaseModel):
    """An error or mistake during the session."""
    type: Optional[str] = None
    severity: Optional[str] = None  # low/medium/high
    timestamp: Optional[float] = None
    context: Optional[str] = None


class Scores(BaseModel):
    """Performance scores from the session."""
    overall_score: Optional[float] = None
    precision_score: Optional[float] = None
    angle_control_score: Optional[float] = None
    tissue_handling_score: Optional[float] = None
    speed_vs_safety_score: Optional[float] = None


class ExpertReference(BaseModel):
    """Expert baseline data for comparison."""
    average_completion_time: Optional[float] = None
    average_overall_score: Optional[float] = None
    key_expert_patterns: Optional[List[str]] = None


class SessionData(BaseModel):
    """Complete session data for summary generation."""
    procedure_name: Optional[str] = None
    student_id: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    duration_seconds: Optional[float] = None
    tool_events: Optional[List[ToolEvent]] = []
    errors: Optional[List[ErrorEvent]] = []
    scores: Optional[Scores] = None
    expert_reference: Optional[ExpertReference] = None


class SummaryRequest(BaseModel):
    """Request model - accepts session_data."""
    session_data: SessionData


class SummaryResponse(BaseModel):
    """Response model with the generated summary."""
    summary: str


# ===================================
# Prompt Builder (Grounding is CRITICAL)
# ===================================

def build_comprehensive_prompt(session: SessionData) -> str:
    """
    Build a grounded prompt for generating student-friendly summary.
    Only includes data that is actually present.
    """
    
    # Build context sections based on available data
    sections = []
    
    # Session basics
    if session.procedure_name:
        sections.append(f"PROCEDURE: {session.procedure_name}")
    
    if session.duration_seconds:
        minutes = int(session.duration_seconds // 60)
        seconds = int(session.duration_seconds % 60)
        sections.append(f"DURATION: {minutes}m {seconds}s")
    
    # Scores
    if session.scores:
        score_lines = []
        if session.scores.overall_score is not None:
            score_lines.append(f"  - Overall Score: {session.scores.overall_score}/100")
        if session.scores.precision_score is not None:
            score_lines.append(f"  - Precision Score: {session.scores.precision_score}/100")
        if session.scores.angle_control_score is not None:
            score_lines.append(f"  - Angle Control Score: {session.scores.angle_control_score}/100")
        if session.scores.tissue_handling_score is not None:
            score_lines.append(f"  - Tissue Handling Score: {session.scores.tissue_handling_score}/100")
        if session.scores.speed_vs_safety_score is not None:
            score_lines.append(f"  - Speed vs Safety Score: {session.scores.speed_vs_safety_score}/100")
        if score_lines:
            sections.append("SCORES:\n" + "\n".join(score_lines))
    
    # Tool events
    if session.tool_events:
        tool_lines = []
        for i, event in enumerate(session.tool_events[:10]):  # Limit to 10
            line = f"  {i+1}. "
            if event.tool_name:
                line += f"{event.tool_name}"
            if event.target_region:
                line += f" on {event.target_region}"
            if event.angle_deviation_degrees is not None:
                line += f" | angle deviation: {event.angle_deviation_degrees}°"
            if event.position_error_mm is not None:
                line += f" | position error: {event.position_error_mm}mm"
            if event.depth_error_mm is not None:
                line += f" | depth error: {event.depth_error_mm}mm"
            tool_lines.append(line)
        if tool_lines:
            sections.append("TOOL EVENTS:\n" + "\n".join(tool_lines))
    
    # Errors
    if session.errors:
        error_lines = []
        high_count = sum(1 for e in session.errors if e.severity == "high")
        medium_count = sum(1 for e in session.errors if e.severity == "medium")
        low_count = sum(1 for e in session.errors if e.severity == "low")
        
        error_lines.append(f"  Total: {len(session.errors)} errors ({high_count} high, {medium_count} medium, {low_count} low severity)")
        
        for i, err in enumerate(session.errors[:8]):  # Limit to 8
            line = f"  - [{err.severity or 'unknown'}] {err.type or 'error'}"
            if err.context:
                line += f": {err.context}"
            if err.timestamp is not None:
                line += f" (at {err.timestamp}s)"
            error_lines.append(line)
        
        sections.append("ERRORS:\n" + "\n".join(error_lines))
    
    # Expert reference
    if session.expert_reference:
        ref_lines = []
        if session.expert_reference.average_completion_time:
            ref_lines.append(f"  - Expert avg completion time: {session.expert_reference.average_completion_time}s")
        if session.expert_reference.average_overall_score:
            ref_lines.append(f"  - Expert avg score: {session.expert_reference.average_overall_score}/100")
        if session.expert_reference.key_expert_patterns:
            ref_lines.append(f"  - Key expert patterns: {', '.join(session.expert_reference.key_expert_patterns[:3])}")
        if ref_lines:
            sections.append("EXPERT REFERENCE:\n" + "\n".join(ref_lines))
    
    data_block = "\n\n".join(sections) if sections else "No detailed data provided."
    
    prompt = f"""You are a supportive surgical skills coach generating a performance summary for a medical student.

CRITICAL RULES:
1. ONLY describe what is directly supported by the data below - do not invent details
2. Be encouraging but specific - cite actual numbers from the data
3. Keep language clear and professional, avoid shaming
4. If data is missing, skip that section without mentioning the absence
5. Use the exact format specified below

SESSION DATA:
{data_block}

Generate a summary report in this EXACT format:

---

# Session Summary

## Overview
[One short paragraph: procedure name, duration, and performance level inferred from overall score:
- 0-40: "beginner level"
- 41-60: "developing skills"  
- 61-80: "progressing well"
- 81-100: "near expert level"]

## Key Metrics
• Overall Score: [X]/100
• Precision: [X]/100
• Angle Control: [X]/100
• [Include other scores if available]
• [If expert reference exists, add comparison like "Completed X% slower/faster than expert average"]

## What You Did Well
• [Specific strength from data with numbers, e.g., "Maintained stable angle within 3° on 85% of cuts"]
• [Another strength]
• [Another strength if applicable]

## Areas for Improvement
• [Specific issue] during [step/region]: [brief actionable suggestion]
• [Another issue with location and suggestion]
• [Another if applicable]

## Suggested Practice Plan
• [Specific drill based on weakness, e.g., "Repeat incision module targeting < 5° angle deviation"]
• [Another focused practice suggestion]
• [Advanced variation if a skill is strong]

## Goals for Next Session
• Increase [metric] from [current] to [target]
• Reduce [error type] from [current count] to [target count]

---

Now generate the summary:"""

    return prompt


# ===================================
# Gemini API Call
# ===================================

async def call_gemini(prompt: str) -> str:
    """Call Gemini API to generate the summary."""
    try:
        from google import genai
        from google.genai import types
        
        api_key = os.getenv("GEMINI_API_KEY")
        
        if not api_key:
            raise ValueError("GEMINI_API_KEY not set")
        
        client = genai.Client(api_key=api_key)
        
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.3,
                max_output_tokens=2048,
            )
        )
        
        return response.text
        
    except ValueError as e:
        raise e
    except Exception as e:
        raise RuntimeError(f"Gemini API error: {str(e)}")


# ===================================
# Mock Summary Generator (Dev Mode)
# ===================================

def generate_mock_summary(session: SessionData) -> str:
    """Generate a realistic mock summary for dev mode testing."""
    
    # Extract data with defaults
    procedure = session.procedure_name or "Surgical Practice"
    duration = session.duration_seconds or 300
    minutes = int(duration // 60)
    seconds = int(duration % 60)
    
    overall = session.scores.overall_score if session.scores and session.scores.overall_score else 72
    precision = session.scores.precision_score if session.scores and session.scores.precision_score else 68
    angle = session.scores.angle_control_score if session.scores and session.scores.angle_control_score else 75
    tissue = session.scores.tissue_handling_score if session.scores and session.scores.tissue_handling_score else 70
    speed = session.scores.speed_vs_safety_score if session.scores and session.scores.speed_vs_safety_score else 65
    
    # Determine performance level
    if overall >= 81:
        level = "near expert level"
    elif overall >= 61:
        level = "progressing well"
    elif overall >= 41:
        level = "developing skills"
    else:
        level = "beginner level"
    
    # Count errors
    error_count = len(session.errors) if session.errors else 2
    high_errors = sum(1 for e in (session.errors or []) if e.severity == "high")
    
    # Expert comparison
    expert_time = session.expert_reference.average_completion_time if session.expert_reference and session.expert_reference.average_completion_time else duration * 0.8
    time_diff = ((duration - expert_time) / expert_time) * 100
    time_comparison = f"Completed {abs(time_diff):.0f}% {'slower' if time_diff > 0 else 'faster'} than expert average"
    
    return f"""# Session Summary

## Overview
You completed the **{procedure}** in {minutes}m {seconds}s. Based on your overall score of {overall}/100, you are at **{level}**. This session shows solid foundational technique with specific areas to refine.

## Key Metrics
• **Overall Score:** {overall}/100
• **Precision:** {precision}/100
• **Angle Control:** {angle}/100
• **Tissue Handling:** {tissue}/100
• **Speed vs Safety:** {speed}/100
• {time_comparison}

## What You Did Well
• Maintained consistent hand positioning throughout the majority of the procedure
• Angle control score of {angle}/100 shows good instrument orientation awareness
• Completed all major steps without critical safety violations

## Areas for Improvement
• **Precision consistency** during mid-procedure: Focus on maintaining steady pressure throughout each motion
• **Speed management** in the final phase: Slow down during closing steps to ensure accurate placement
• **Error recovery**: {error_count} errors recorded - practice recognizing early warning signs

## Suggested Practice Plan
• Repeat the basic incision module with focus on < 5° angle deviation
• Practice the tissue handling drill at 75% speed before increasing pace
• Complete 3 repetitions of the closing sequence with emphasis on precision over speed

## Goals for Next Session
• Increase overall score from {overall} to {min(100, overall + 8)}
• Reduce high-severity errors from {high_errors} to {max(0, high_errors - 1)}
• Improve precision score from {precision} to {min(100, precision + 10)}"""


# ===================================
# Endpoint
# ===================================

@router.post("/summary", response_model=SummaryResponse)
async def generate_summary(request: SummaryRequest):
    """
    Generate a comprehensive, student-friendly summary of surgical practice session.
    
    Takes full session_data including metrics, errors, scores, and expert reference.
    Returns a structured summary report with actionable feedback.
    """
    
    session = request.session_data
    api_key = os.getenv("GEMINI_API_KEY")
    dev_mode = os.getenv("DEV_MODE", "true").lower() == "true"
    
    if not api_key:
        if dev_mode:
            mock_summary = generate_mock_summary(session)
            return SummaryResponse(summary=mock_summary)
        else:
            raise HTTPException(
                status_code=501,
                detail="GEMINI_API_KEY not set"
            )
    
    # Build the comprehensive prompt
    prompt = build_comprehensive_prompt(session)
    
    try:
        summary_text = await call_gemini(prompt)
        return SummaryResponse(summary=summary_text)
        
    except ValueError as e:
        raise HTTPException(status_code=501, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"LLM summary generation failed: {str(e)}"
        )
