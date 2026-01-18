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
 * - Avoid duplicates like "Control control"
 */
export function extractKeyConcepts(notes: string[]): string[] {
  if (notes.length === 0) return [];

  // Parse all notes to get LOG items (ignore MOMENT items for key concepts)
  const allLogs: string[] = [];
  for (const note of notes) {
    const parsed = parseOvershootOutput(note);
    allLogs.push(...parsed.logs);
  }
  
  if (allLogs.length === 0) return [];
  
  // Extract actionable concepts by extracting unique themes and actions
  const concepts: string[] = [];
  const seenThemes = new Set<string>();
  const seenNormalized = new Set<string>();
  
  // Theme keywords (prioritized themes)
  const themeMap: Record<string, string> = {
    'wrist': 'wrist stability',
    'grip': 'instrument grip',
    'forceps': 'instrument control',
    'scalpel': 'instrument control',
    'retractor': 'retraction technique',
    'retraction': 'retraction technique',
    'exposure': 'tissue exposure',
    'force': 'force modulation',
    'pressure': 'force modulation',
    'modulation': 'force modulation',
    'angle': 'approach angle',
    'dissection': 'tissue dissection',
    'tissue': 'tissue handling',
    'handling': 'tissue handling',
    'cautery': 'hemostasis',
    'suturing': 'wound closure',
  };
  
  // Action verbs for actionable concepts
  const actionVerbs = ['maintain', 'avoid', 'keep', 'reduce', 'stabilize', 'control', 'ensure', 
                       'focus', 'apply', 'adjust', 'modulate', 'handle', 'minimize', 'preserve',
                       'use', 'position', 'direct', 'prevent'];
  
  // First pass: Extract theme-based concepts
  for (const log of allLogs) {
    if (concepts.length >= 8) break;
    
    const lower = log.toLowerCase();
    const words = log.split(/\s+/);
    
    // Find theme keyword
    let themeKey: string | null = null;
    for (const [keyword, theme] of Object.entries(themeMap)) {
      if (lower.includes(keyword) && !seenThemes.has(theme)) {
        themeKey = theme;
        seenThemes.add(theme);
        break;
      }
    }
    
    // Find action verb
    let actionVerb: string | null = null;
    for (const verb of actionVerbs) {
      if (lower.includes(verb)) {
        actionVerb = verb;
        break;
      }
    }
    
    // Build concept from action + theme
    if (themeKey && actionVerb) {
      // Build actionable phrase: "Maintain wrist stability" not "Control control"
      const conceptWords: string[] = [];
      
      // Add action verb (capitalized)
      conceptWords.push(actionVerb.charAt(0).toUpperCase() + actionVerb.slice(1));
      
      // Add theme (avoid repeating the verb)
      const themeWords = themeKey.split(' ');
      for (const word of themeWords) {
        if (word.toLowerCase() !== actionVerb.toLowerCase()) {
          conceptWords.push(word);
        }
      }
      
      const concept = conceptWords.join(' ').trim();
      
      // Hard enforce ≤8 words
      const conceptWordsList = concept.split(/\s+/);
      if (conceptWordsList.length <= 8) {
        const normalized = normalize(concept);
        if (!seenNormalized.has(normalized)) {
          concepts.push(concept);
          seenNormalized.add(normalized);
        }
      }
    }
  }
  
  // Second pass: Extract additional actionable phrases if we have < 4 concepts
  if (concepts.length < 4) {
    for (const log of allLogs) {
      if (concepts.length >= 8) break;
      
      const words = log.split(/\s+/);
      
      // Extract first actionable phrase (up to 8 words)
      // Start from first verb if found
      let startIdx = 0;
      for (let i = 0; i < words.length; i++) {
        const word = words[i].toLowerCase().replace(/[^\w]/g, '');
        if (actionVerbs.includes(word)) {
          startIdx = i;
          break;
        }
      }
      
      const phraseWords = words.slice(startIdx, startIdx + 8);
      const concept = phraseWords.join(' ').trim();
      
      // Skip if too short or empty
      if (concept.length < 5) continue;
      
      // Hard enforce ≤8 words
      const conceptWordsList = concept.split(/\s+/);
      if (conceptWordsList.length <= 8) {
        const normalized = normalize(concept);
        
        // Check for duplicates (exact and near-duplicate)
        let isDuplicate = false;
        for (const existing of concepts) {
          if (normalized === normalize(existing) || 
              similarity(tokenize(concept), tokenize(existing)) >= 0.75) {
            isDuplicate = true;
            break;
          }
        }
        
        // Check for theme duplicates
        let isThemeDuplicate = false;
        for (const theme of seenThemes) {
          if (concept.toLowerCase().includes(theme.toLowerCase()) || 
              theme.toLowerCase().includes(concept.toLowerCase())) {
            isThemeDuplicate = true;
            break;
          }
        }
        
        if (!isDuplicate && !isThemeDuplicate && !seenNormalized.has(normalized)) {
          concepts.push(concept);
          seenNormalized.add(normalized);
        }
      }
    }
  }
  
  // Ensure 4-8 concepts
  return concepts.slice(0, 8).filter(c => c.split(/\s+/).length <= 8);
}

/**
 * Extract 3-6 Notable Moments from notes with timestamps.
 * 
 * Requirements:
 * - 3-6 items
 * - Timestamps come from video.currentTime (attached in code, not from model)
 * - Format: "mm:ss – <insight>" if timestamp exists
 * - Do NOT trust model-provided timestamps (they may be hallucinated)
 * - Prefer MOMENT type notes, but include LOG notes if interesting
 * 
 * Notes format: Array of objects { text: string, timestamp: number, type: 'LOG' | 'MOMENT' } or strings
 */
export function extractNotableMoments(notes: (string | { text: string; timestamp?: number; type?: 'LOG' | 'MOMENT' })[]): string[] {
  if (notes.length === 0) return [];
  
  // Extract notable moments: prefer MOMENT type with code-attached timestamps
  const moments: Array<{ text: string; timestamp: number; priority: number }> = [];
  const seen = new Set<string>();
  
  // Process notes: prioritize MOMENT type, then LOG type with timestamps
  for (const note of notes) {
    let text: string;
    let timestamp: number | undefined;
    let type: 'LOG' | 'MOMENT' = 'LOG';
    
    if (typeof note === 'object') {
      text = note.text;
      timestamp = note.timestamp;
      type = note.type || 'LOG';
    } else {
      text = note;
      // Try to parse MOMENT from text
      const parsed = parseOvershootOutput(text);
      if (parsed.moments.length > 0) {
        text = parsed.moments[0];
        type = 'MOMENT';
      }
    }
    
    // Remove any model-provided timestamps from text
    text = text.replace(/^\d+[:\d]*[sm]?\s*[-–]?\s*/i, '').trim();
    
    if (!text) continue;
    
    const normalized = normalize(text);
    if (seen.has(normalized)) continue;
    
    // Only include if we have a valid timestamp (code-attached)
    if (timestamp !== undefined && timestamp > 0) {
      // Priority: MOMENT type = 1, LOG type = 2
      const priority = type === 'MOMENT' ? 1 : 2;
      moments.push({ text, timestamp, priority });
      seen.add(normalized);
    }
  }
  
  // Sort by priority (MOMENT first), then by timestamp
  moments.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.timestamp - b.timestamp;
  });
  
  // Format and return 3-6 moments with timestamps
  const formattedMoments = moments
    .slice(0, 6) // Max 6 moments
    .map(({ text, timestamp }) => {
      const timeStr = formatTimestamp(timestamp);
      return `${timeStr} – ${text}`;
    });
  
  // Ensure at least 3 moments if we have enough notes
  if (formattedMoments.length < 3 && moments.length >= 3) {
    // Include more LOG notes if needed
    const remaining = moments.slice(formattedMoments.length, 3);
    for (const { text, timestamp } of remaining) {
      const timeStr = formatTimestamp(timestamp);
      formattedMoments.push(`${timeStr} – ${text}`);
    }
  }
  
  return formattedMoments.slice(0, 6);
}

/**
 * Format timestamp (seconds) as MM:SS
 */
function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
