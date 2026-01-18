/**
 * Note Processing Utilities for Part 1
 * 
 * Handles:
 * - Parsing Overshoot output (LOG:/MOMENT: format)
 * - Strong deduplication (exact + near-duplicate + template dedupe)
 * - Extracting Key Concepts (≤8 words, verbs allowed, 4-8 total)
 * - Extracting Notable Moments (0-4, time-based if available)
 * - Generating Overview (2 sentences max)
 */

// Stopwords for deduplication (common words to ignore)
const STOPWORDS = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'being', 'have', 
  'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
  'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their', 'there', 'here',
  'during', 'while', 'when', 'where', 'which', 'who', 'what', 'how', 'why']);

/**
 * Normalize text for comparison: lowercase, remove punctuation, collapse whitespace
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenize text and remove stopwords
 */
export function tokenize(text: string): string[] {
  const normalized = normalize(text);
  return normalized
    .split(/\s+/)
    .filter(token => token.length > 2 && !STOPWORDS.has(token));
}

/**
 * Compute Jaccard similarity (intersection/union) between two token sets
 */
export function similarity(tokens1: string[], tokens2: string[]): number {
  if (tokens1.length === 0 && tokens2.length === 0) return 1;
  if (tokens1.length === 0 || tokens2.length === 0) return 0;
  
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

/**
 * Check if a note is a near-duplicate against the last N accepted notes
 * Uses Jaccard similarity >= 0.75 threshold
 */
export function isNearDuplicate(newNote: string, acceptedNotes: string[], lookbackCount: number = 15): boolean {
  if (acceptedNotes.length === 0) return false;
  
  const newTokens = tokenize(newNote);
  if (newTokens.length === 0) return true; // Empty after tokenization
  
  const recentNotes = acceptedNotes.slice(-lookbackCount);
  
  for (const accepted of recentNotes) {
    const acceptedTokens = tokenize(accepted);
    const sim = similarity(newTokens, acceptedTokens);
    
    if (sim >= 0.75) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if note is a template repeat (requires at least 2 new content tokens)
 */
export function hasNewContentTokens(newNote: string, lastAccepted: string | null): boolean {
  if (!lastAccepted) return true;
  
  const newTokens = new Set(tokenize(newNote));
  const lastTokens = new Set(tokenize(lastAccepted));
  
  // Count tokens in newNote that are NOT in lastAccepted
  const newContentTokens = [...newTokens].filter(t => !lastTokens.has(t));
  
  // Require at least 2 new content tokens
  return newContentTokens.length >= 2;
}

/**
 * Parse Overshoot output into LOG and MOMENT items
 * 
 * Overshoot outputs:
 * - LOG: <one sentence, 8-16 words>
 * - MOMENT: <optional time> <one sentence, 8-18 words>
 */
export function parseOvershootOutput(text: string): { logs: string[]; moments: string[] } {
  const logs: string[] = [];
  const moments: string[] = [];
  
  // Split by lines and parse each
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  
  for (const line of lines) {
    // Parse LOG: items
    if (line.startsWith('LOG:')) {
      const logText = line.replace(/^LOG:\s*/i, '').trim();
      if (logText && logText.length > 0) {
        logs.push(logText);
      }
    }
    // Parse MOMENT: items
    else if (line.startsWith('MOMENT:')) {
      const momentText = line.replace(/^MOMENT:\s*/i, '').trim();
      if (momentText && momentText.length > 0) {
        moments.push(momentText);
      }
    }
    // Fallback: if no prefix, treat as LOG item
    else if (line.length > 0 && !line.includes(':')) {
      logs.push(line);
    }
  }
  
  return { logs, moments };
}

/**
 * Deduplicate notes: remove exact duplicates and near-duplicates.
 * Uses strong deduplication: exact match, Jaccard similarity >= 0.75, and template dedupe.
 */
export function deduplicateNotes(notes: string[]): string[] {
  const unique: string[] = [];
  const seenExact = new Set<string>();

  for (const note of notes) {
    const normalized = normalize(note);
    
    // Skip exact duplicates (normalized)
    if (seenExact.has(normalized)) {
      continue;
    }

    // Check for near-duplicates using Jaccard similarity (>= 0.75 threshold)
    if (isNearDuplicate(note, unique, 15)) {
      continue;
    }

    // Template dedupe: require at least 2 new content tokens
    const lastAccepted = unique.length > 0 ? unique[unique.length - 1] : null;
    if (!hasNewContentTokens(note, lastAccepted)) {
      continue;
    }

    // Passed all filters
    unique.push(note);
    seenExact.add(normalized);
  }

  return unique;
}

/**
 * Extract a 2-sentence overview from accumulated notes.
 * 
 * Requirements:
 * - 2 sentences max
 * - Abstract themes (instrument control, retraction/exposure, force modulation)
 * - Must NOT reuse any full log sentence verbatim
 * - Generate abstract summary based on patterns, not direct quotes
 */
export function extractSummary(notes: string[]): string {
  if (notes.length === 0) return '';

  // Parse all notes to get LOG items (no verbatim reuse)
  const allLogs: string[] = [];
  for (const note of notes) {
    const parsed = parseOvershootOutput(note);
    allLogs.push(...parsed.logs);
  }
  
  if (allLogs.length === 0) return '';
  
  // Extract abstract themes from patterns in logs
  const themes: string[] = [];
  const themeKeywords: Record<string, string> = {
    'wrist stability': 'wrist stability',
    'wrist': 'wrist stability',
    'grip': 'instrument control',
    'handle': 'instrument control',
    'positioning': 'instrument control',
    'retraction': 'retraction and exposure',
    'exposure': 'retraction and exposure',
    'force': 'force modulation',
    'modulation': 'force modulation',
    'pressure': 'force modulation',
    'angle': 'angle control',
    'approach': 'angle control',
  };
  
  const lowerText = allLogs.join(' ').toLowerCase();
  const foundThemes = new Set<string>();
  
  // Detect themes from keywords
  for (const [keyword, theme] of Object.entries(themeKeywords)) {
    if (lowerText.includes(keyword) && !foundThemes.has(theme)) {
      foundThemes.add(theme);
      themes.push(theme);
    }
  }
  
  // Generate abstract summary sentences (not verbatim from logs)
  if (themes.length >= 2) {
    return `The procedure demonstrates focused attention on ${themes[0]} and ${themes[1]}. Technical execution shows consistent application of surgical principles with emphasis on ${themes[0]}.`;
  } else if (themes.length === 1) {
    return `The procedure emphasizes ${themes[0]} throughout. Technical execution demonstrates consistent application of surgical principles.`;
  } else if (allLogs.length > 0) {
    // Fallback: generic abstract summary
    return 'The procedure demonstrates consistent application of surgical technique and instrument control. Technical execution shows focused attention to procedural details.';
  }
  
  return '';
}

/**
 * Extract 4-8 Key Concepts from accumulated notes.
 * 
 * Requirements:
 * - 4-8 items, each ≤8 words, verbs allowed
 * - Deduplicate by theme (only one "wrist stability" concept)
 * - Should read like actionable reminders, not narration
 */
export function extractKeyConcepts(notes: string[]): string[] {
  if (notes.length === 0) return [];

  // Parse all notes to get LOG items
  const allLogs: string[] = [];
  for (const note of notes) {
    const parsed = parseOvershootOutput(note);
    allLogs.push(...parsed.logs);
  }
  
  if (allLogs.length === 0) return [];
  
  // Extract actionable concepts by theme (deduplicate by theme keyword)
  const themeMap: Record<string, string> = {};
  const actionVerbs = ['maintain', 'avoid', 'keep', 'reduce', 'stabilize', 'control', 'ensure', 
                       'focus', 'apply', 'adjust', 'modulate', 'handle', 'minimize', 'preserve'];
  
  const themeKeywords: Record<string, string> = {
    'wrist stability': 'wrist',
    'wrist': 'wrist',
    'grip': 'grip',
    'handling': 'grip',
    'retraction': 'retraction',
    'exposure': 'exposure',
    'force': 'force',
    'modulation': 'force',
    'pressure': 'force',
    'angle': 'angle',
    'control': 'control',
    'positioning': 'positioning',
  };
  
  for (const log of allLogs) {
    const lower = log.toLowerCase();
    const words = log.split(/\s+/);
    
    // Find action verb + theme keyword combination
    let actionVerb: string | null = null;
    let themeKeyword: string | null = null;
    
    for (const verb of actionVerbs) {
      if (lower.includes(verb)) {
        actionVerb = verb;
        break;
      }
    }
    
    for (const [keyword, theme] of Object.entries(themeKeywords)) {
      if (lower.includes(keyword)) {
        themeKeyword = theme;
        break;
      }
    }
    
    if (actionVerb && themeKeyword) {
      // Generate actionable reminder: "Maintain wrist stability" not "Maintains steady wrist"
      const concept = `${actionVerb.charAt(0).toUpperCase() + actionVerb.slice(1)} ${themeKeyword}${themeKeyword === 'wrist' ? ' stability' : themeKeyword === 'grip' ? ' control' : ''}`.trim();
      
      // Deduplicate by theme: only keep one concept per theme
      if (!themeMap[themeKeyword] || concept.length < themeMap[themeKeyword].length) {
        // Keep shorter, more concise version
        if (concept.split(/\s+/).length <= 8) {
          themeMap[themeKeyword] = concept;
        }
      }
    } else if (actionVerb && !themeKeyword && Object.keys(themeMap).length < 8) {
      // Extract simple actionable phrase (first 8 words)
      const concept = words.slice(0, 8).join(' ').trim();
      
      // Simple dedupe by similarity (theme deduplication)
      let isDuplicate = false;
      for (const existing of Object.values(themeMap)) {
        if (similarity(tokenize(concept), tokenize(existing)) >= 0.75) {
          isDuplicate = true;
          break;
        }
      }
      
      if (!isDuplicate && concept.length > 5 && concept.split(/\s+/).length <= 8) {
        themeMap[`general_${Object.keys(themeMap).length}`] = concept;
      }
    }
  }
  
  const concepts = Object.values(themeMap).filter(c => c.split(/\s+/).length <= 8);
  
  // Ensure 4-8 concepts
  if (concepts.length < 4 && allLogs.length > 0) {
    // Fallback: extract simple actionable phrases
    const seenNormalized = new Set<string>();
    for (const log of allLogs) {
      if (concepts.length >= 8) break;
      
      const words = log.split(/\s+/).slice(0, 8);
      const concept = words.join(' ').trim();
      const normalized = normalize(concept);
      
      // Check theme dedupe
      let isThemeDuplicate = false;
      for (const existing of concepts) {
        if (similarity(tokenize(concept), tokenize(existing)) >= 0.75) {
          isThemeDuplicate = true;
          break;
        }
      }
      
      if (!isThemeDuplicate && !seenNormalized.has(normalized) && concept.length > 5) {
        concepts.push(concept);
        seenNormalized.add(normalized);
      }
    }
  }
  
  return concepts.slice(0, 8);
}

/**
 * Extract 0-3 Notable Moments from notes with timestamps.
 * 
 * Requirements:
 * - Max 0-3 items
 * - Timestamps come from video.currentTime (attached in code, not from model)
 * - Format: "[time] – <insight>" if timestamp exists, otherwise just insight
 * - Do NOT trust model-provided timestamps (they may be hallucinated)
 * 
 * Notes format: Array of objects { text: string, timestamp?: number } or strings
 */
export function extractNotableMoments(notes: (string | { text: string; timestamp?: number })[]): string[] {
  if (notes.length === 0) return [];
  
  // Extract notable moments: prefer items with timestamps attached in code
  const moments: string[] = [];
  const seen = new Set<string>();
  
  // Find notes with timestamps (attached by code)
  const timestampedNotes: Array<{ text: string; timestamp: number }> = [];
  const nonTimestampedNotes: string[] = [];
  
  for (const note of notes) {
    if (typeof note === 'object' && note.timestamp !== undefined) {
      timestampedNotes.push({ text: note.text, timestamp: note.timestamp });
    } else {
      const text = typeof note === 'string' ? note : note.text;
      // Parse MOMENT items, but ignore model-provided timestamps
      const parsed = parseOvershootOutput(text);
      nonTimestampedNotes.push(...parsed.moments);
    }
  }
  
  // Format timestamped moments first (code-attached timestamps are trusted)
  for (const { text, timestamp } of timestampedNotes) {
    const formattedMoment = formatTimestamp(timestamp) + ' – ' + text.trim();
    const normalized = normalize(text);
    
    if (!seen.has(normalized) && moments.length < 3) {
      moments.push(formattedMoment);
      seen.add(normalized);
    }
  }
  
  // Add non-timestamped moments if we have space (no timestamp shown)
  for (const moment of nonTimestampedNotes) {
    if (moments.length >= 3) break;
    
    // Remove any model-provided timestamps from the text
    const cleanMoment = moment.replace(/^\d+[:\d]*[sm]?\s*[-–]?\s*/i, '').trim();
    const normalized = normalize(cleanMoment);
    
    if (cleanMoment && !seen.has(normalized)) {
      moments.push(cleanMoment); // No timestamp prefix
      seen.add(normalized);
    }
  }
  
  return moments.slice(0, 3);
}

/**
 * Format timestamp (seconds) as MM:SS
 */
function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
