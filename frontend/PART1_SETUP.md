# Part 1: Expert Video Analysis Setup

## Overview

Part 1 enables expert surgical video upload and AI-powered analysis using Overshoot AI. The flow is **frontend-only** - no backend required.

## User Flow

1. **Upload Video** → User selects MP4/MOV file
2. **Video Preview** → Video displays on left panel with playback controls
3. **Auto-Analysis** → Overshoot AI automatically starts analyzing the video
4. **Streaming Observations** → Real-time notes appear on right panel (deduplicated)
5. **Final Summary** → On completion, displays:
   - 2-3 sentence summary
   - 3-6 key concepts (chips)
   - 0-4 notable moments (bullets)

## Environment Setup

1. **Copy `.env.example` to `.env`:**
   ```bash
   cd frontend
   cp .env.example .env
   ```

2. **Add your Overshoot API key:**
   ```bash
   # Edit .env and add:
   VITE_OVERSHOOT_API_KEY=ovs_your_key_here
   ```

3. **Get API key:**
   - Sign up at https://overshoot.ai
   - Obtain your API key from the dashboard

## Running the Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`

## Architecture

### Service Layer (`src/services/overshoot.ts`)
- Wrapper around `@overshoot/sdk`
- Handles API key validation
- Normalizes result formats
- Provides clean error handling

### Note Processing (`src/utils/noteProcessing.ts`)
- **Deduplication**: Removes exact duplicates + near-duplicates (>80% word overlap)
- **Summary Extraction**: Takes first 2-3 complete sentences from notes
- **Key Concepts**: Extracts action/technique phrases (3-6 items)
- **Notable Moments**: Filters for significant observations (0-4 items)

### Components

**ExpertVideoPanel** (`src/components/ExpertVideoPanel.tsx`)
- Handles file upload and video preview
- Manages Overshoot analysis lifecycle
- Auto-starts analysis on file upload
- Deduplicates notes in real-time
- Extracts summary/key concepts on completion

**ExpertSummaryPanel** (`src/components/ExpertSummaryPanel.tsx`)
- Displays states: idle → analyzing → complete → error
- Shows streaming notes during analysis
- Renders final summary, key concepts, and notable moments

## Implementation Notes

### Deduplication Logic
- **Exact matches**: Case-insensitive comparison
- **Near-duplicates**: >80% word overlap (considers words >3 chars)
- Applied in real-time as notes arrive

### Summary Extraction
- Takes first 2-3 sentences from deduplicated notes
- Filters by sentence length (20-200 chars)
- Falls back to first note if no sentences found

### Key Concepts
- Looks for sentences containing action words (`maintain`, `demonstrate`, `focus`, etc.)
- Or technique terms (`technique`, `positioning`, `grip`, `angle`, etc.)
- Limits to 6 concepts maximum

### Notable Moments
- Filters for observations with significance keywords (`excellent`, `notable`, `important`, etc.)
- Limits to 4 moments maximum

## Error Handling

- **Missing API Key**: Shows error message with setup instructions
- **Overshoot API Errors**: Displays error in UI, does not crash
- **No Results**: Shows "no observations" message (no fake data)

## States

1. **Idle**: "Upload video to generate observations"
2. **Analyzing**: Shows streaming notes with "Analyzing..." indicator
3. **Complete**: Shows final summary, key concepts, notable moments
4. **Error**: Shows error message with guidance
