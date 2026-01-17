# SurgeonSight AI — Product Requirements Document
### 24-Hour Hackathon Build | NexHacks 2026

---

## Document Info
| Field | Value |
|-------|-------|
| Product | SurgeonSight AI |
| Version | 1.0 (Hackathon MVP) |
| Timeline | 24 hours |
| Team Size | Assumed 3-5 members |
| Created | January 2026 |

---

## 1. Executive Summary

**What:** Real-time AI surgical skills coach that uses computer vision to analyze instrument handling and provides instant voice feedback.

**Why:** Medical students lack access to consistent, real-time feedback during practice. We democratize surgical education with AI.

**How:** Webcam → CV analysis → AI feedback generation → Voice output in <500ms total latency.

**24-Hour Goal:** A working demo where a user practices suturing on camera, receives real-time voice corrections, and gets a session summary.

---

## 2. Success Criteria

### Demo Must Achieve
- [ ] Live video feed displayed in browser
- [ ] CV detects at least ONE instrument/hand state
- [ ] Voice feedback triggers within 1 second of detection
- [ ] Session ends with generated text summary
- [ ] Works reliably for 3-minute demo without crashing

### Sponsor Integration Targets
| Priority | Sponsor | Integration |
|----------|---------|-------------|
| P0 | LiveKit | Video streaming |
| P0 | Smallest.ai | Voice feedback |
| P1 | Overshoot OR custom CV | Instrument detection |
| P1 | Mastra | Agent orchestration |
| P2 | Arize/Phoenix | Basic tracing |
| P2 | Lovable | UI scaffold |
| P3 | Camb.AI | Translation demo |
| P3 | Wolfram Alpha | Procedure lookup |

**Minimum viable sponsor count: 4 (LiveKit, Smallest.ai, CV solution, Mastra)**

---

## 3. Scope Definition

### IN SCOPE (Must Have)
| Feature | Description | Acceptance Criteria |
|---------|-------------|---------------------|
| Video capture | Browser-based webcam feed | 720p, 30fps minimum |
| Video display | User sees themselves | <100ms local latency |
| Hand detection | Detect hand in frame | Bounding box or skeleton |
| Grip classification | Correct vs. incorrect grip | Binary classification, >70% accuracy on demo cases |
| Voice feedback | AI speaks corrections | Natural speech, <1s from trigger |
| Session notes | Text summary at end | Lists timestamps + events |
| Basic UI | Clean, functional interface | Video + status + end button |

### OUT OF SCOPE (Do Not Build)
- Multiple procedure types (suturing only)
- User authentication/accounts
- Persistent data storage
- Mobile app
- Multi-camera support
- Detailed analytics dashboard
- Instructor/admin portal
- HIPAA compliance implementation (mention in pitch only)
- Real medical device integration

### STRETCH GOALS (If Time Permits)
- Camb.AI translation to Spanish
- Progress bar showing procedure steps
- Replay with annotations
- Leaderboard mock-up

---

## 4. User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER JOURNEY                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. LAND          2. START         3. PRACTICE      4. REVIEW  │
│  ─────────        ─────────        ───────────      ─────────  │
│                                                                 │
│  [Landing    ──▶  [Camera     ──▶  [Live        ──▶ [Session   │
│   Page]           Permission]      Coaching]        Summary]   │
│                                                                 │
│  - Hero text      - Grant access   - See self       - Score    │
│  - Start btn      - Calibration    - Hear feedback  - Notes    │
│                     check          - See overlays   - Restart  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Screen Specifications

**Screen 1: Landing Page**
- Hero: "Your AI Surgical Coach"
- Subtext: "Real-time feedback. Any language. Just a webcam."
- CTA Button: "Start Practice Session"
- Footer: Sponsor logos

**Screen 2: Camera Setup**
- Camera permission request
- Preview window
- "Camera detected" confirmation
- "Begin Session" button
- Checklist: Good lighting, hands visible, instrument ready

**Screen 3: Live Coaching (Main Experience)**
```
┌────────────────────────────────────────────────┐
│  SurgeonSight AI              [End Session]    │
├────────────────────────────────────────────────┤
│                                                │
│         ┌──────────────────────┐               │
│         │                      │               │
│         │     VIDEO FEED       │               │
│         │   (with overlays)    │               │
│         │                      │               │
│         └──────────────────────┘               │
│                                                │
│  Status: ● Analyzing...                        │
│                                                │
│  Last Feedback: "Good grip position"           │
│                                                │
│  Session Time: 02:34                           │
│                                                │
└────────────────────────────────────────────────┘
```

**Screen 4: Session Summary**
- Total time
- Feedback count (corrections vs. encouragements)
- Timestamped event log
- "Practice Again" button

---

## 5. Technical Architecture

### System Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   BROWSER   │     │   SERVER    │     │  SERVICES   │
│             │     │             │     │             │
│  - React UI │────▶│  - Node.js  │────▶│  - LiveKit  │
│  - LiveKit  │     │  - Mastra   │     │  - Smallest │
│    SDK      │◀────│  - Express  │◀────│  - CV Model │
│             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
     WebRTC            WebSocket           REST APIs
```

### Component Breakdown

#### Frontend (React + Vite)
```
/src
  /components
    Landing.jsx         # Hero page
    CameraSetup.jsx     # Permission + preview
    CoachingSession.jsx # Main experience
    SessionSummary.jsx  # End screen
    VideoFeed.jsx       # LiveKit video component
    FeedbackDisplay.jsx # Shows last feedback text
  /hooks
    useLiveKit.js       # LiveKit connection
    useSession.js       # Session state management
  /utils
    api.js              # Backend communication
  App.jsx
  main.jsx
```

#### Backend (Node.js + Express)
```
/server
  index.js              # Express server entry
  /routes
    session.js          # Start/end session endpoints
    feedback.js         # Webhook for CV results
  /services
    livekit.js          # LiveKit server SDK
    smallest.js         # Smallest.ai TTS
    cv.js               # CV model inference
    mastra.js           # Agent orchestration
  /agents
    coachAgent.js       # Mastra coaching agent
    notesAgent.js       # Session notes agent
```

#### CV Pipeline
```
Frame Capture (LiveKit)
       │
       ▼
  Preprocessing
  - Resize to 640x480
  - Normalize
       │
       ▼
  Hand Detection
  - MediaPipe Hands OR
  - Overshoot API
       │
       ▼
  Grip Classification
  - Custom classifier
  - 3 classes: correct, palmed, other_error
       │
       ▼
  Feedback Trigger
  - State change detection
  - Cooldown (no spam)
```

### API Contracts

#### POST /api/session/start
```json
// Request
{ "userId": "demo-user" }

// Response
{
  "sessionId": "sess_abc123",
  "livekitToken": "eyJ...",
  "roomName": "surgery-room-abc"
}
```

#### POST /api/session/end
```json
// Request
{ "sessionId": "sess_abc123" }

// Response
{
  "summary": {
    "duration": 180,
    "feedbackCount": 12,
    "corrections": 8,
    "encouragements": 4,
    "events": [
      { "time": 15, "type": "correction", "message": "Adjust grip..." },
      { "time": 42, "type": "encouragement", "message": "Good angle!" }
    ]
  }
}
```

#### WebSocket: /ws/feedback
```json
// Server → Client
{
  "type": "feedback",
  "category": "correction",
  "message": "Try holding the instrument like a pencil",
  "timestamp": 1234567890,
  "audioUrl": "https://..." // or base64
}
```

---

## 6. Sponsor Integration Specs

### LiveKit Integration
**Purpose:** Real-time video streaming + room management

**Implementation:**
```javascript
// Frontend: Connect to room
import { LiveKitRoom, VideoTrack } from '@livekit/components-react';

<LiveKitRoom
  serverUrl={LIVEKIT_URL}
  token={token}
  onConnected={() => startAnalysis()}
>
  <VideoTrack />
</LiveKitRoom>

// Backend: Generate token
import { AccessToken } from 'livekit-server-sdk';

const token = new AccessToken(API_KEY, API_SECRET, {
  identity: participantId,
});
token.addGrant({ roomJoin: true, room: roomName });
```

**Endpoints Needed:**
- LiveKit Cloud URL (free tier)
- API Key + Secret

---

### Smallest.ai Integration
**Purpose:** Sub-100ms voice feedback

**Implementation:**
```javascript
// Generate speech from text
const response = await fetch('https://api.smallest.ai/v1/speech', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SMALLEST_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    text: "Adjust your grip position",
    voice_id: "coach-friendly",
    model: "lightning" // fastest model
  })
});

const audioBuffer = await response.arrayBuffer();
// Stream to client or return URL
```

**Voice Configuration:**
- Model: Lightning (fastest)
- Voice: Warm, encouraging tone
- Speed: 1.0x (clear instruction)

---

### Mastra Integration
**Purpose:** Agent orchestration for feedback logic

**Implementation:**
```typescript
import { Agent, Workflow } from '@mastra/core';

const coachAgent = new Agent({
  name: 'SurgicalCoach',
  instructions: `You are a surgical skills coach. Given CV analysis results,
    determine if feedback is needed and generate encouraging, specific guidance.
    Keep feedback under 15 words. Be supportive, not critical.`,
  model: 'gpt-4o-mini', // fast + cheap
});

const feedbackWorkflow = new Workflow({
  name: 'feedback-pipeline',
  steps: [
    {
      id: 'analyze',
      execute: async (cvResult) => {
        if (cvResult.gripError && !recentFeedback()) {
          return await coachAgent.generate(cvResult);
        }
        return null;
      }
    },
    {
      id: 'speak',
      execute: async (feedback) => {
        if (feedback) {
          return await smallest.speak(feedback);
        }
      }
    }
  ]
});
```

---

### CV Implementation Options

**Option A: MediaPipe (Fastest to implement)**
```javascript
import { Hands } from '@mediapipe/hands';

const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.7
});

hands.onResults((results) => {
  if (results.multiHandLandmarks) {
    const gripState = classifyGrip(results.multiHandLandmarks[0]);
    if (gripState !== lastGripState) {
      triggerFeedback(gripState);
    }
  }
});
```

**Option B: Overshoot API (If available)**
```javascript
const analysis = await overshoot.analyze({
  image: frameBase64,
  model: 'surgical-instruments', // or custom
  detect: ['hands', 'instruments', 'grip']
});
```

**Grip Classification Logic:**
```javascript
function classifyGrip(landmarks) {
  // Simplified: check thumb-index distance and wrist angle
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const wrist = landmarks[0];
  
  const pinchDistance = distance(thumbTip, indexTip);
  const wristAngle = calculateAngle(wrist, landmarks[5], landmarks[17]);
  
  if (pinchDistance < 0.05 && wristAngle > 140) {
    return 'correct'; // Pencil grip
  } else if (pinchDistance > 0.15) {
    return 'palmed'; // Fist grip
  } else {
    return 'other_error';
  }
}
```

---

### Arize/Phoenix Integration (P2)
**Purpose:** Trace LLM calls for debugging

```python
from phoenix.trace import trace
from opentelemetry import trace as otel_trace

tracer = otel_trace.get_tracer(__name__)

@trace
async def generate_feedback(cv_result):
    with tracer.start_as_current_span("feedback-generation"):
        response = await coachAgent.generate(cv_result)
        return response
```

---

## 7. Feedback Content

### Correction Messages (Grip Errors)
```
"Try the pencil grip—thumb and index finger, like you're writing."
"Loosen up a bit. A death grip causes tremors."
"Rotate your wrist slightly. Better angle of approach."
"Slow down. Smooth, controlled movements."
"Watch your fulcrum point. Anchor for stability."
```

### Encouragement Messages
```
"Nice grip position. Keep it up."
"Good angle. You're getting it."
"Smooth motion. That's the technique."
"Excellent control. Well done."
"Great improvement from earlier."
```

### State Machine
```
                    ┌──────────────┐
                    │   CORRECT    │
                    │    GRIP      │
                    └──────┬───────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
   ┌───────────┐    ┌───────────┐    ┌───────────┐
   │  PALMED   │    │  ANGLED   │    │  TREMOR   │
   │   GRIP    │    │   WRONG   │    │ DETECTED  │
   └───────────┘    └───────────┘    └───────────┘
   
   Cooldown: 5 seconds between same-category feedback
   Max frequency: 1 feedback per 3 seconds
```

---

## 8. Development Timeline

### Hour-by-Hour Schedule

```
HOUR 0-2: PROJECT SETUP
├── Initialize repos (frontend + backend)
├── Set up LiveKit account + get credentials
├── Set up Smallest.ai account + get API key
├── Install dependencies
├── Verify all API access works
└── Basic "hello world" for each integration

HOUR 2-6: CORE INFRASTRUCTURE
├── LiveKit video streaming working
├── Frontend displays live video
├── Backend WebSocket connection
├── Basic UI layout (Lovable or manual)
└── Frame capture pipeline

HOUR 6-10: CV PIPELINE
├── MediaPipe hands integration
├── Grip classification logic
├── State change detection
├── Feedback trigger system
└── Test with real hand movements

HOUR 10-14: VOICE FEEDBACK
├── Smallest.ai integration
├── Mastra agent setup
├── Feedback message generation
├── Audio playback in browser
└── End-to-end: detection → voice

HOUR 14-18: SESSION MANAGEMENT
├── Session start/end flow
├── Event logging
├── Summary generation
├── Notes display UI
└── Full user flow working

HOUR 18-22: POLISH + STRETCH
├── UI cleanup and styling
├── Error handling
├── Arize tracing (if time)
├── Camb.AI translation (if time)
├── Edge case fixes
└── Performance optimization

HOUR 22-24: DEMO PREP
├── Demo script rehearsal
├── Backup recordings
├── Pitch deck finalization
├── Hardware setup check
└── Sleep (optional but recommended)
```

### Parallel Workstreams

```
PERSON 1 (Frontend)          PERSON 2 (Backend)         PERSON 3 (CV/ML)
─────────────────────        ──────────────────         ────────────────
Hour 0-2: React setup        Hour 0-2: Node setup       Hour 0-2: Research
Hour 2-6: LiveKit UI         Hour 2-6: LiveKit server   Hour 2-6: MediaPipe
Hour 6-10: Video display     Hour 6-10: WebSocket       Hour 6-10: Classifier
Hour 10-14: Feedback UI      Hour 10-14: Mastra agent   Hour 10-14: Testing
Hour 14-18: Summary page     Hour 14-18: Session logic  Hour 14-18: Tuning
Hour 18-22: Polish           Hour 18-22: Integration    Hour 18-22: Edge cases
Hour 22-24: Demo support     Hour 22-24: Demo support   Hour 22-24: Demo support
```

---

## 9. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| LiveKit setup issues | Medium | High | Have backup WebRTC solution (simple-peer) |
| CV accuracy too low | Medium | High | Simplify to binary detection; use obvious gestures for demo |
| Smallest.ai latency | Low | High | Pre-generate common phrases; cache audio |
| API rate limits | Medium | Medium | Cache responses; batch requests |
| Demo crashes | Medium | Critical | Pre-recorded backup video ready |
| Team member blocked | Medium | High | Clear ownership; parallel workstreams |
| Scope creep | High | High | Strict MVP adherence; no stretch until core works |

### Contingency Plans

**If CV doesn't work:**
- Fallback to Wizard-of-Oz (manual trigger of feedback)
- Use obvious color markers instead of hand detection

**If voice latency too high:**
- Pre-generate top 10 feedback phrases
- Use browser Web Speech API as backup

**If LiveKit fails:**
- Simple getUserMedia() + canvas
- Lose real-time streaming, keep local processing

---

## 10. Demo Requirements

### Hardware Checklist
- [ ] Laptop with webcam (720p+)
- [ ] External webcam (backup / better angle)
- [ ] Suture practice pad or orange
- [ ] Needle driver (or chopsticks for demo)
- [ ] Good lighting (ring light if available)
- [ ] Charger
- [ ] Backup laptop

### Software Checklist
- [ ] Chrome browser (latest)
- [ ] All environment variables set
- [ ] Backend deployed (Vercel/Railway/local)
- [ ] Frontend deployed (Vercel/Netlify)
- [ ] Test run completed
- [ ] Screen recording software ready

### Demo Script (3 min)

**[0:00-0:20] Hook**
> "What if every medical student could have a personal surgical coach—watching, correcting, encouraging—in real-time? Meet SurgeonSight AI."

**[0:20-0:40] Problem**
> "Surgical training is bottlenecked. One attending, one student. Feedback is delayed. And if you're not at a top medical school? Good luck."

**[0:40-2:00] Live Demo**
1. Open app, grant camera permission
2. Start session
3. Show correct grip → "Good grip position"
4. Intentionally palm the instrument → "Try the pencil grip..."
5. Correct it → "Nice adjustment"
6. End session → Show summary

**[2:00-2:30] Tech Stack**
> "Under the hood: LiveKit for real-time video, Overshoot for CV, Mastra orchestrating our AI agents, and Smallest.ai for sub-100ms voice—all HIPAA compliant."

**[2:30-2:50] Impact + Scale**
> "A student in rural India, practicing at home with a $20 suture kit and a webcam, getting the same feedback as someone at Johns Hopkins. In any of 140 languages."

**[2:50-3:00] Close**
> "SurgeonSight AI. Because every surgeon deserves a coach."

---

## 11. Success Metrics

### Hackathon Success
| Metric | Target |
|--------|--------|
| Demo completes without crash | 100% |
| Sponsors integrated | ≥4 |
| Judges engaged during demo | Visible interest |
| Q&A answered confidently | All questions |

### Technical Success
| Metric | Target |
|--------|--------|
| End-to-end latency | <1 second |
| Grip detection accuracy | >70% on demo cases |
| Voice clarity | Understandable |
| UI responsiveness | No visible lag |

---

## 12. Post-Hackathon Notes

### If We Win
- Capture judge feedback
- Get sponsor contacts
- Schedule follow-ups with VCs present
- Document learnings

### Regardless of Outcome
- GitHub repo cleanup + README
- Record polished demo video
- Write blog post / Twitter thread
- Consider continuing development

---

## Appendix A: Environment Variables

```bash
# .env.local (frontend)
VITE_LIVEKIT_URL=wss://your-app.livekit.cloud
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001

# .env (backend)
LIVEKIT_API_KEY=your_key
LIVEKIT_API_SECRET=your_secret
LIVEKIT_URL=wss://your-app.livekit.cloud
SMALLEST_API_KEY=your_key
OPENAI_API_KEY=your_key  # for Mastra
ARIZE_API_KEY=your_key   # optional
CAMB_API_KEY=your_key    # optional
```

---

## Appendix B: Quick Links

| Resource | URL |
|----------|-----|
| LiveKit Docs | https://docs.livekit.io/ |
| Smallest.ai Docs | https://smallest.ai/docs |
| Mastra Docs | https://mastra.ai/docs |
| MediaPipe Hands | https://google.github.io/mediapipe/solutions/hands |
| Arize Phoenix | https://docs.arize.com/phoenix |
| Camb.ai Docs | https://docs.camb.ai/ |

---

## Appendix C: Feedback Message Bank

### Corrections (30 pre-written)
```
1. "Pencil grip—thumb and index finger only."
2. "Loosen your grip. Less tension."
3. "Rotate wrist clockwise slightly."
4. "Anchor your hand for stability."
5. "Slower, more controlled movements."
6. "Watch your angle of approach."
7. "Don't palm the instrument."
8. "Fingers closer to the tip."
9. "Steady your forearm."
10. "Relax your shoulders."
... (20 more in codebase)
```

### Encouragements (20 pre-written)
```
1. "Good grip. Keep it steady."
2. "Nice angle. Well done."
3. "Smooth motion. Excellent."
4. "Great control there."
5. "That's the technique."
... (15 more in codebase)
```

---

*LFG. 24 hours. Let's build it.* 🚀
