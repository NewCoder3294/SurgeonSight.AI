/**
 * Note Processing Utilities for Part 1
 * 
 * Handles:
 * - Parsing Overshoot output (structured JSON format)
 * - Strong deduplication with concept-level signatures
 * - Quality filtering for actionable observations
 * - Extracting Key Concepts (≤8 words, verbs allowed, 4-8 total)
 * - Extracting Notable Moments (0-4, time-based if available)
 * - Generating Overview (2 sentences max)
 */

// Structured Observation type
export interface Observation {
  text: string;
  category: 'technique' | 'instrument' | 'exposure' | 'tissue' | 'safety' | 'efficiency' | 'general';
  startMs?: number;
  endMs?: number;
  confidence?: number;
}

// Stopwords for deduplication (common words to ignore)
const STOPWORDS = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'being', 'have', 
  'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
  'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their', 'there', 'here',
  'during', 'while', 'when', 'where', 'which', 'who', 'what', 'how', 'why']);

// Adjectives to remove from concept signatures (keep verb+noun tokens)
const ADJECTIVES = new Set(['good', 'proper', 'appropriate', 'effective', 'excellent', 'optimal', 
  'correct', 'accurate', 'stable', 'consistent', 'precise', 'careful', 'gentle', 'minimal']);

// Ban phrases that indicate vague rubric/jargon (only accept if purpose clause exists)
const BAN_PHRASES = [
  'observed', 'demonstrates', 'demonstrated', 'shows', 'showing', 'appears', 'appearing',
  'appropriate', 'appropriate technique', 'appropriate handling', 'appropriate use',
  'effective', 'effective technique', 'effective use', 'effectively',
  'good technique', 'good handling', 'good practice',
  'proper handling', 'proper technique', 'proper use', 'properly',
  'correctly', 'adequately', 'suitably', 'satisfactorily'
];

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
 * Quality filter: rejects rubric/jargon lines unless they contain:
 * (1) an actionable verb, (2) a concrete target/object, (3) a purpose clause
 */
export function qualityFilter(text: string): boolean {
  const lower = text.toLowerCase();
  
  // Actionable verbs (must have at least one)
  const actionVerbs = [
    'adjust', 'maintain', 'stabilize', 'modulate', 'optimize', 'control', 'minimize', 'maximize',
    'apply', 'position', 'direct', 'handle', 'manipulate', 'retract', 'expose', 'dissect',
    'clamp', 'cauterize', 'ligate', 'suture', 'incise', 'grasp', 'release', 'rotate',
    'advance', 'withdraw', 'align', 'secure', 'anchor', 'support', 'counter', 'prevent',
    'avoid', 'reduce', 'increase', 'modify', 'change', 'alter', 'ensure', 'achieve'
  ];
  
  // Concrete targets/objects (must have at least one)
  const concreteTargets = [
    'instrument', 'forceps', 'scalpel', 'retractor', 'grip', 'angle', 'position',
    'tissue', 'vessel', 'artery', 'vein', 'plane', 'dissection', 'exposure',
    'retraction', 'hemostasis', 'bleeding', 'cautery', 'pressure', 'force',
    'trajectory', 'movement', 'motion', 'approach', 'entry', 'incision'
  ];
  
  // Purpose clause indicators
  const purposeIndicators = /\b(to|so that|in order to|because|to prevent|to avoid|to ensure|to achieve|to maintain|to optimize)\b/i;
  
  // Check for actionable verb
  const hasActionVerb = actionVerbs.some(verb => {
    const regex = new RegExp(`\\b${verb}(?:s|ed|ing)?\\b`, 'i');
    return regex.test(text);
  });
  
  // Check for concrete target
  const hasConcreteTarget = concreteTargets.some(target => lower.includes(target));
  
  // Check for purpose clause
  const hasPurposeClause = purposeIndicators.test(text);
  
  // Check for ban phrases
  const hasBanPhrase = BAN_PHRASES.some(phrase => {
    const regex = new RegExp(`\\b${phrase}\\b`, 'i');
    return regex.test(text);
  });
  
  // Reject if ban phrase present AND no purpose clause
  if (hasBanPhrase && !hasPurposeClause) {
    return false;
  }
  
  // Accept if has verb AND target (purpose clause helps but not required)
  return hasActionVerb && hasConcreteTarget;
}

/**
 * Concept signature: lowercase, remove stopwords/adjectives, keep verb+noun-ish tokens
 * Used for concept-level deduplication (not exact string matching)
 */
export function conceptSignature(text: string): string {
  const normalized = normalize(text);
  const tokens = normalized
    .split(/\s+/)
    .filter(token => {
      // Remove stopwords, adjectives, and very short tokens
      return token.length > 2 && 
             !STOPWORDS.has(token) && 
             !ADJECTIVES.has(token);
    });
  
  return tokens.join(' ');
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
 * Parsed Overshoot output structure
 */
export interface ParsedOvershootOutput {
  observations: Observation[];
  keyConcepts: string[];
  notableMoments: Array<{ text: string; timestampMs: number; confidence?: number }>;
  overview?: string;
  confidence?: string;
  uncertaintyFlags?: string[];
  lowSignal?: boolean;
  scaffold?: string[]; // Educational scaffold when low signal
  observedInstruments?: string[]; // Instruments actually seen in video
  observedMaterials?: string[]; // Materials actually seen in video
}

/**
 * Extract mentions of surgical tools/instruments from text
 * Returns set of mentioned instruments from controlled vocabulary
 */
function extractToolMentions(text: string): Set<string> {
  const lower = text.toLowerCase();
  const mentioned = new Set<string>();
  
  // Controlled vocabulary of surgical instruments/tools
  const instrumentTerms = [
    'scalpel', 'scissors', 'forceps', 'needle driver', 'needledriver', 'needle holder',
    'retractor', 'suction', 'cautery', 'bipolar', 'monopolar', 'trocar', 'laparoscope',
    'laparoscopic', 'stapler', 'clip applier', 'grasper', 'dissector', 'hemostat',
    'clamp', 'probe', 'hook', 'elevator', 'curette', 'rasp', 'saw', 'drill'
  ];
  
  for (const term of instrumentTerms) {
    // Use word boundary matching to avoid partial matches
    const regex = new RegExp(`\\b${term.replace(/\s+/g, '\\s+')}\\b`, 'i');
    if (regex.test(lower)) {
      mentioned.add(term);
    }
  }
  
  return mentioned;
}

/**
 * Grounding filter: reject observations mentioning instruments not in allowed set
 * Also handles simulation fallback (ban surgical instruments if banana detected)
 */
function groundingFilter(
  text: string, 
  allowedInstruments?: string[], 
  allowedMaterials?: string[]
): boolean {
  // Extract tool mentions from text
  const mentionedTools = extractToolMentions(text);
  
  // If no tool mentions, pass through (not a grounding issue)
  if (mentionedTools.size === 0) {
    return true;
  }
  
  // Simulation hint: if materials include "banana", ban surgical instruments
  const isSimulation = allowedMaterials?.some(m => m.toLowerCase().includes('banana')) || false;
  const surgicalInstruments = new Set(['scalpel', 'trocar', 'laparoscope', 'laparoscopic', 'cautery', 'bipolar', 'suction']);
  
  if (isSimulation) {
    // Check if text mentions surgical instruments (not allowed in simulation)
    for (const tool of mentionedTools) {
      if (surgicalInstruments.has(tool.toLowerCase())) {
        // Only reject if tool is not in allowed list (or if allowed list is empty but we're in simulation mode)
        if (!allowedInstruments || allowedInstruments.length === 0 || !allowedInstruments.includes(tool)) {
          return false;
        }
      }
    }
  }
  
  // If allowedInstruments is empty/undefined, pass through (fallback mode - don't hard-reject)
  if (!allowedInstruments || allowedInstruments.length === 0) {
    return true;
  }
  
  // Normalize allowed instruments to lowercase for comparison
  const allowedSet = new Set(allowedInstruments.map(i => i.toLowerCase()));
  
  // Check if all mentioned tools are in allowed set
  for (const tool of mentionedTools) {
    if (!allowedSet.has(tool.toLowerCase())) {
      // Tool mentioned but not in allowed list - reject
      return false;
    }
  }
  
  return true;
}

/**
 * Categorize observation text into category based on keywords
 */
function categorizeObservation(text: string): Observation['category'] {
  const lower = text.toLowerCase();
  
  if (lower.includes('instrument') || lower.includes('grip') || lower.includes('forceps') || 
      lower.includes('scalpel') || lower.includes('angle') || lower.includes('handle')) {
    return 'instrument';
  }
  if (lower.includes('exposure') || lower.includes('retraction') || lower.includes('retractor') || 
      lower.includes('visualization')) {
    return 'exposure';
  }
  if (lower.includes('tissue') || lower.includes('dissection') || lower.includes('plane') || 
      lower.includes('manipulation') || lower.includes('handling')) {
    return 'tissue';
  }
  if (lower.includes('hemostasis') || lower.includes('bleeding') || lower.includes('cautery') || 
      lower.includes('bipolar') || lower.includes('vessel')) {
    return 'technique';
  }
  if (lower.includes('safety') || lower.includes('avoid') || lower.includes('prevent') || 
      lower.includes('risk') || lower.includes('caution')) {
    return 'safety';
  }
  if (lower.includes('motion') || lower.includes('economy') || lower.includes('efficiency') || 
      lower.includes('movement') || lower.includes('trajectory')) {
    return 'efficiency';
  }
  
  return 'general';
}

/**
 * Parse Overshoot output - supports both JSON and legacy LOG:/MOMENT: formats
 * Returns structured Observations with categories and quality filtering
 */
export function parseOvershootOutput(text: string): ParsedOvershootOutput {
  // Try parsing as JSON first
  let jsonData: any = null;
  try {
    // Remove markdown code blocks if present
    const cleanedText = text.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim();
    jsonData = JSON.parse(cleanedText);
  } catch (e) {
    // Not JSON, fall back to legacy format
  }
  
  const observations: Observation[] = [];
  const notableMoments: Array<{ text: string; timestampMs: number; confidence?: number }> = [];
  let keyConcepts: string[] = [];
  let overview: string | undefined;
  let confidence: string | undefined;
  let uncertaintyFlags: string[] | undefined;
  let observedInstruments: string[] | undefined;
  let observedMaterials: string[] | undefined;
  
  if (jsonData && typeof jsonData === 'object') {
    // Extract observed_instruments and observed_materials for grounding
    observedInstruments = Array.isArray(jsonData.observed_instruments)
      ? jsonData.observed_instruments.filter((i: any) => typeof i === 'string' && i.trim().length > 0)
      : undefined;
    observedMaterials = Array.isArray(jsonData.observed_materials)
      ? jsonData.observed_materials.filter((m: any) => typeof m === 'string' && m.trim().length > 0)
      : undefined;
    // Minimal schema validation: check if JSON has expected structure
    // If neither observations nor observation_log exists, treat as malformed (but don't throw)
    if (!Array.isArray(jsonData.observations) && !Array.isArray(jsonData.observation_log) && 
        !jsonData.overview && !Array.isArray(jsonData.key_concepts) && !Array.isArray(jsonData.notable_moments)) {
      // Malformed or empty JSON - return empty result (will trigger fallback)
      return {
        observations: [],
        keyConcepts: [],
        notableMoments: [],
      };
    }
    
    // Parse structured JSON format - support both new format (observations array) and legacy (observation_log strings)
    // NEW FORMAT: observations: [{ text, category, start_ms, end_ms, confidence }]
    // LEGACY FORMAT: observation_log: ["string", "string", ...]
    
    // Try new format first: observations array with structured objects
    // FIX: Handle multi-line or multi-sentence observations by splitting into single sentences
    if (Array.isArray(jsonData.observations)) {
      for (const obs of jsonData.observations) {
        if (typeof obs === 'object' && obs.text && typeof obs.text === 'string') {
          let text = obs.text.trim();
          
          // Handle case where text contains multiple sentences or newlines
          // Split by newlines first, then by sentence boundaries (period + space) as fallback
          let sentenceCandidates: string[] = [];
          
          if (text.includes('\n')) {
            // Split by newlines
            sentenceCandidates = text.split('\n')
              .map(s => s.trim())
              .filter(s => s.length > 0);
          } else {
            // Check if multiple sentences (period followed by space/capital)
            const sentenceMatch = text.match(/[^.!?]+[.!?]+(?:\s|$)/g);
            if (sentenceMatch && sentenceMatch.length > 1) {
              sentenceCandidates = sentenceMatch.map(s => s.trim()).filter(s => s.length > 0);
            } else {
              // Single sentence - keep as is
              sentenceCandidates = [text];
            }
          }
          
          // Process each sentence candidate as a separate observation
          for (const candidate of sentenceCandidates) {
            const cleanText = candidate.trim();
            if (!cleanText || !qualityFilter(cleanText)) continue;
            
            // Apply grounding filter: reject if mentions unallowed instruments
            if (!groundingFilter(cleanText, observedInstruments, observedMaterials)) {
              continue; // Skip observation that mentions unallowed instruments
            }
            
            const category = (obs.category && typeof obs.category === 'string') 
              ? (obs.category as Observation['category'])
              : categorizeObservation(cleanText);
            
            observations.push({
              text: cleanText,
              category,
              startMs: typeof obs.start_ms === 'number' ? obs.start_ms : undefined,
              endMs: typeof obs.end_ms === 'number' ? obs.end_ms : undefined,
              confidence: typeof obs.confidence === 'number' ? obs.confidence : undefined,
            });
          }
        } else if (typeof obs === 'string') {
          // Handle case where observations array contains raw strings
          const text = obs.trim();
          if (!text || !qualityFilter(text)) continue;
          
          // Split if multi-line or multi-sentence
          let sentenceCandidates: string[] = [];
          if (text.includes('\n')) {
            sentenceCandidates = text.split('\n').map(s => s.trim()).filter(s => s.length > 0);
          } else {
            const sentenceMatch = text.match(/[^.!?]+[.!?]+(?:\s|$)/g);
            if (sentenceMatch && sentenceMatch.length > 1) {
              sentenceCandidates = sentenceMatch.map(s => s.trim()).filter(s => s.length > 0);
            } else {
              sentenceCandidates = [text];
            }
          }
          
          for (const candidate of sentenceCandidates) {
            if (!qualityFilter(candidate)) continue;
            
            // Apply grounding filter
            if (!groundingFilter(candidate, observedInstruments, observedMaterials)) {
              continue;
            }
            
            observations.push({
              text: candidate,
              category: categorizeObservation(candidate),
            });
          }
        }
      }
    }
    // Fallback to legacy format: observation_log array of strings
    // FIX: Handle multi-line or multi-sentence strings by splitting into single sentences
    else if (Array.isArray(jsonData.observation_log)) {
      const logStrings: string[] = jsonData.observation_log.filter((log: any) => typeof log === 'string' && log.trim().length > 0);
      
      for (const logText of logStrings) {
        const trimmed = logText.trim();
        
        // Split if multi-line or multi-sentence
        let sentenceCandidates: string[] = [];
        if (trimmed.includes('\n')) {
          // Split by newlines
          sentenceCandidates = trimmed.split('\n')
            .map(s => s.trim())
            .filter(s => s.length > 0);
        } else {
          // Check if multiple sentences (period/exclamation/question + space)
          const sentenceMatch = trimmed.match(/[^.!?]+[.!?]+(?:\s+|$)/g);
          if (sentenceMatch && sentenceMatch.length > 1) {
            sentenceCandidates = sentenceMatch.map(s => s.trim()).filter(s => s.length > 0);
          } else {
            // Single sentence - keep as is
            sentenceCandidates = [trimmed];
          }
        }
        
        // Process each sentence candidate separately
        for (const candidate of sentenceCandidates) {
          if (!qualityFilter(candidate)) continue;
          
          // Apply grounding filter
          if (!groundingFilter(candidate, observedInstruments, observedMaterials)) {
            continue;
          }
          
          const category = categorizeObservation(candidate);
          observations.push({
            text: candidate,
            category,
          });
        }
      }
    }
    
    // Parse notable moments - use timestamp_ms (milliseconds) directly from JSON
    // Apply grounding filter to notable moments as well
    if (Array.isArray(jsonData.notable_moments)) {
      for (const moment of jsonData.notable_moments) {
        if (typeof moment === 'object' && moment.text) {
          const text = moment.text.trim();
          
          // Apply grounding filter: reject moments mentioning unallowed instruments
          if (!groundingFilter(text, observedInstruments, observedMaterials)) {
            continue; // Skip moment that mentions unallowed instruments
          }
          // Use timestamp_ms directly (milliseconds) - prompt specifies this format
          const timestampMs = typeof moment.timestamp_ms === 'number' && moment.timestamp_ms > 0
            ? moment.timestamp_ms
            : (typeof moment.timestamp === 'number' && moment.timestamp > 0
              ? moment.timestamp * 1000 // Legacy: convert seconds to milliseconds
              : null);
          const conf = typeof moment.confidence === 'number' ? moment.confidence : undefined;
          
          // Validate timestamp is reasonable (between 1s and 10 minutes)
          if (timestampMs !== null && timestampMs >= 1000 && timestampMs < 600000) {
            notableMoments.push({
              text,
              timestampMs,
              confidence: conf
            });
          }
        } else if (typeof moment === 'string' && moment.trim().length > 0) {
          // String format - no timestamp
        }
      }
    }
    
    overview = typeof jsonData.overview === 'string' ? jsonData.overview.trim() : undefined;
    keyConcepts = Array.isArray(jsonData.key_concepts) 
      ? jsonData.key_concepts.filter((c: any) => typeof c === 'string' && c.trim().length > 0)
      : [];
    confidence = typeof jsonData.confidence === 'string' ? jsonData.confidence : undefined;
    uncertaintyFlags = Array.isArray(jsonData.uncertainty_flags) 
      ? jsonData.uncertainty_flags.filter((f: any) => typeof f === 'string')
      : undefined;
  } else {
    // Fall back to legacy LOG:/MOMENT: format
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  
  for (const line of lines) {
    // Parse LOG: items
    if (line.startsWith('LOG:')) {
      const logText = line.replace(/^LOG:\s*/i, '').trim();
        if (logText && logText.length > 0 && qualityFilter(logText) && 
            groundingFilter(logText, observedInstruments, observedMaterials)) {
          const category = categorizeObservation(logText);
          observations.push({
            text: logText,
            category,
          });
      }
    }
    // Parse MOMENT: items
    else if (line.startsWith('MOMENT:')) {
      const momentText = line.replace(/^MOMENT:\s*/i, '').trim();
        // Try to extract timestamp if present (format: "MM:SS" or "seconds" at start)
        const timestampMatch = momentText.match(/^(\d+:\d+|\d+(?:\.\d+)?[sm]?)\s*[-–]\s*(.+)/i);
        if (timestampMatch) {
          const timeStr = timestampMatch[1];
          const timeText = timestampMatch[2].trim();
          let timestampMs: number | null = null;
          
          // Parse timestamp (if MM:SS format, convert to seconds, then to ms)
          if (timeStr.includes(':')) {
            const [mins, secs] = timeStr.split(':').map(Number);
            if (!isNaN(mins) && !isNaN(secs)) {
              timestampMs = (mins * 60 + secs) * 1000;
            }
          } else {
            const numTime = parseFloat(timeStr.replace(/[sm]/g, ''));
            if (!isNaN(numTime)) {
              timestampMs = numTime * 1000; // Convert seconds to milliseconds
            }
          }
          
          if (timestampMs !== null && timestampMs > 1000) {
            notableMoments.push({ text: timeText, timestampMs });
          }
      }
    }
    // Fallback: if no prefix, treat as LOG item
      else if (line.length > 0 && !line.includes(':') && qualityFilter(line) &&
               groundingFilter(line, observedInstruments, observedMaterials)) {
        const category = categorizeObservation(line);
        observations.push({
          text: line,
          category,
        });
      }
    }
  }
  
  // Dev console logs for validation
  if (typeof console !== 'undefined' && observations.length > 0) {
    console.log('[Grounding] allowed instruments:', observedInstruments || 'none');
    console.log('[Grounding] allowed materials:', observedMaterials || 'none');
    console.log('[Grounding] first 5 observations:', observations.slice(0, 5).map(o => o.text));
  }
  
  // Apply deterministic thinning based on duration
  // Infer duration from observations if not explicitly provided (use max end_ms or estimate from count)
  let inferredDurationMs = 20000; // Default fallback
  if (observations.length > 0) {
    const maxEndMs = Math.max(...observations.map(o => o.endMs || 0).filter(ms => ms > 0));
    if (maxEndMs > 0) {
      inferredDurationMs = maxEndMs;
    } else {
      // Estimate: assume ~4-6s per observation if no timestamps
      inferredDurationMs = Math.max(observations.length * 5000, 15000);
    }
  }
  
  const thinnedObservations = thinObservationsDeterministic(observations, inferredDurationMs);
  
  // Dev log for thinning
  if (typeof console !== 'undefined') {
    const intervalMs = inferredDurationMs <= 20000 ? 4000 : 6000;
    const maxCount = Math.max(1, Math.ceil(inferredDurationMs / intervalMs));
    console.log('[thin] durationMs', inferredDurationMs, 'intervalMs', intervalMs, 'maxCount', maxCount, 'before', observations.length, 'after', thinnedObservations.length);
  }
  
  // Apply anti-repetition filter: prevent consecutive observations starting with same word
  const finalObservations = preventConsecutiveFirstWordRepetition(thinnedObservations);
  
  // Check for low signal: if < 3 observations after quality + grounding + thinning filtering, generate scaffold
  let lowSignal = false;
  let scaffold: string[] | undefined;
  
  if (thinnedObservations.length < 3) {
    lowSignal = true;
    // Generate educational scaffold without claiming these occurred in the video
    scaffold = [
      'Focus areas to review: exposure stability',
      'Focus areas to review: instrument angle',
      'Focus areas to review: traction-countertraction',
      'Focus areas to review: hemostasis technique',
      'Focus areas to review: motion economy',
      'Focus areas to review: tissue handling'
    ];
  }
  
  return {
    observations: finalObservations, // Return thinned + anti-repetition filtered observations
    keyConcepts,
    notableMoments,
    overview,
    confidence,
    uncertaintyFlags,
    lowSignal,
    scaffold,
    observedInstruments,
    observedMaterials
  };
}

/**
 * Thin observations deterministically based on duration and interval
 * For short videos: use 4s interval; else 6s interval
 * Deterministic selection: same input => same output
 */
export function thinObservationsDeterministic(observations: Observation[], durationMs: number, intervalMs?: number): Observation[] {
  if (observations.length === 0) return [];
  
  // Determine interval: 4000ms for short videos (<=20s), else 6000ms
  const effectiveInterval = intervalMs || (durationMs <= 20000 ? 4000 : 6000);
  const maxCount = Math.max(1, Math.ceil(durationMs / effectiveInterval));
  
  // Category priority: safety > exposure > instrument > tissue > efficiency > technique > general
  const categoryPriority: Record<Observation['category'], number> = {
    'safety': 7,
    'exposure': 6,
    'instrument': 5,
    'tissue': 4,
    'efficiency': 3,
    'technique': 2,
    'general': 1
  };
  
  // Helper: extract first sentence only (enforce single sentence)
  const extractFirstSentence = (text: string): string => {
    // Remove newlines
    let cleaned = text.replace(/\n/g, ' ').trim();
    // Extract first sentence (period/exclamation/question followed by space or end)
    const sentenceMatch = cleaned.match(/^[^.!?]+[.!?]+(?:\s|$)/);
    if (sentenceMatch) {
      return sentenceMatch[0].trim();
    }
    return cleaned;
  };
  
  // First: deduplicate by concept signature
  const deduped = deduplicateObservations(observations);
  
  // Normalize text to first sentence only
  const normalized = deduped.map(obs => ({
    ...obs,
    text: extractFirstSentence(obs.text)
  }));
  
  // Case A: If observations have start_ms, bucket by time interval
  const hasTimestamps = normalized.some(obs => obs.startMs !== undefined);
  
  if (hasTimestamps) {
    // Bucket by bucketIndex = floor(start_ms / intervalMs)
    const buckets = new Map<number, Observation[]>();
    
    for (const obs of normalized) {
      if (obs.startMs !== undefined) {
        const bucketIndex = Math.floor(obs.startMs / effectiveInterval);
        if (!buckets.has(bucketIndex)) {
          buckets.set(bucketIndex, []);
        }
        buckets.get(bucketIndex)!.push(obs);
      }
    }
    
    // For each bucket, pick exactly ONE best observation by priority
    const selected: Observation[] = [];
    for (const [_bucketIndex, bucketObs] of Array.from(buckets.entries()).sort((a, b) => a[0] - b[0])) {
      if (selected.length >= maxCount) break;
      
      // Sort bucket by priority: category > confidence > text length > text alphabetically
      bucketObs.sort((a, b) => {
        const catDiff = (categoryPriority[b.category] || 0) - (categoryPriority[a.category] || 0);
        if (catDiff !== 0) return catDiff;
        
        const confA = a.confidence || 0;
        const confB = b.confidence || 0;
        if (confB !== confA) return confB - confA;
        
        if (b.text.length !== a.text.length) return b.text.length - a.text.length;
        
        return a.text.localeCompare(b.text); // Alphabetical for determinism
      });
      
      selected.push(bucketObs[0]);
    }
    
    return selected.slice(0, maxCount);
  }
  
  // Case B: No timestamps - sort deterministically and take first maxCount
  normalized.sort((a, b) => {
    const catDiff = (categoryPriority[b.category] || 0) - (categoryPriority[a.category] || 0);
    if (catDiff !== 0) return catDiff;
    
    const confA = a.confidence || 0;
    const confB = b.confidence || 0;
    if (confB !== confA) return confB - confA;
    
    if (b.text.length !== a.text.length) return b.text.length - a.text.length;
    
    return a.text.localeCompare(b.text); // Alphabetical for determinism
  });
  
  return normalized.slice(0, maxCount);
}

/**
 * Prevent consecutive observations from starting with the same first word
 * Applies safe rewrites if needed to vary sentence starts
 */
export function preventConsecutiveFirstWordRepetition(observations: Observation[]): Observation[] {
  if (observations.length < 2) return observations;
  
  // Helper: get first word (token) from text (case-insensitive)
  const getFirstWord = (text: string): string => {
    const match = text.trim().match(/^[^\s,]+/);
    return match ? match[0].toLowerCase() : '';
  };
  
  // Safe rewrite transforms for common patterns
  const rewriteStarts: Record<string, (text: string) => string> = {
    // "Scissors are ..." -> "Cut is made with scissors ..."
    'scissors': (text) => {
      if (text.toLowerCase().startsWith('scissors are')) {
        const rest = text.replace(/^scissors are\s*/i, '');
        return `Cut is made with scissors ${rest}`;
      }
      return text;
    },
    // "Forceps are ..." -> "Tissue is stabilized with forceps ..."
    'forceps': (text) => {
      if (text.toLowerCase().startsWith('forceps are')) {
        const rest = text.replace(/^forceps are\s*/i, '');
        return `Tissue is stabilized with forceps ${rest}`;
      }
      return text;
    },
    // "Suture is ..." -> "Suture pass is performed ..."
    'suture': (text) => {
      if (text.toLowerCase().startsWith('suture is')) {
        const rest = text.replace(/^suture is\s*/i, '');
        return `Suture pass is performed ${rest}`;
      }
      return text;
    },
  };
  
  const result: Observation[] = [];
  
  for (let i = 0; i < observations.length; i++) {
    const current = observations[i];
    const prev = i > 0 ? result[i - 1] : null;
    
    if (!prev) {
      // First observation - always include as-is
      result.push(current);
      continue;
    }

    const prevFirstWord = getFirstWord(prev.text);
    const currentFirstWord = getFirstWord(current.text);
    
    // If consecutive observations start with same word, attempt rewrite
    if (prevFirstWord && prevFirstWord === currentFirstWord) {
      // Try rewrite based on first word
      let rewritten = current.text;
      if (rewriteStarts[currentFirstWord]) {
        rewritten = rewriteStarts[currentFirstWord](current.text);
      }
      
      // If rewrite didn't change first word, try generic transform
      const rewrittenFirstWord = getFirstWord(rewritten);
      if (rewrittenFirstWord === prevFirstWord && rewrittenFirstWord) {
        // Generic fallback: prepend with action verb if available
        const lower = rewritten.toLowerCase();
        if (lower.includes('to ') || lower.includes('so that') || lower.includes('because')) {
          // Extract action verb and restructure
          const actionMatch = lower.match(/(\w+)\s+(?:the|a|an)?\s*(\w+)/);
          if (actionMatch) {
            const [, verb, noun] = actionMatch;
            rewritten = `${verb.charAt(0).toUpperCase() + verb.slice(1)} ${noun} ${rewritten.replace(new RegExp(`^\\w+\\s+(?:the|a|an)?\\s*${noun}\\s*`, 'i'), '')}`;
          }
        }
      }
      
      result.push({
        ...current,
        text: rewritten
      });
    } else {
      // No repetition - include as-is
      result.push(current);
    }
  }
  
  return result;
}

/**
 * Deduplicate observations: concept-level deduplication using signatures
 * Uses concept signatures (verb+noun tokens) rather than exact string matching
 */
export function deduplicateObservations(observations: Observation[]): Observation[] {
  const unique: Observation[] = [];
  const seenSignatures = new Set<string>();

  for (const obs of observations) {
    // Get concept signature (verb+noun tokens, no stopwords/adjectives)
    const signature = conceptSignature(obs.text);
    
    // Skip if signature already seen (concept-level duplicate)
    if (seenSignatures.has(signature)) {
      continue;
    }

    // Check for near-duplicates using Jaccard similarity on signatures
    // Compare signature tokens to previous signatures
    const signatureTokens = tokenize(signature);
    let isNearDuplicate = false;
    
    for (const existing of unique.slice(-15)) { // Lookback last 15
      const existingSignature = conceptSignature(existing.text);
      const existingTokens = tokenize(existingSignature);
      const sim = similarity(signatureTokens, existingTokens);
      
      if (sim >= 0.75) {
        isNearDuplicate = true;
        break;
      }
    }
    
    if (isNearDuplicate) {
      continue;
    }

    // Passed all filters - add to unique list
    unique.push(obs);
    seenSignatures.add(signature);
  }

  return unique;
}

/**
 * Legacy function for backward compatibility: deduplicate string notes
 * Converts strings to Observations, deduplicates, then extracts text
 */
export function deduplicateNotes(notes: string[]): string[] {
  // Convert strings to Observations for deduplication
  const observations: Observation[] = notes.map(text => ({
    text,
    category: categorizeObservation(text)
  }));
  
  // Use concept-level deduplication
  const unique = deduplicateObservations(observations);
  
  // Return text only
  return unique.map(obs => obs.text);
}

/**
 * Build enhanced overview: expand short/generic overviews with controlled templates
 * Incorporates observed instruments/materials if available
 */
export function buildOverview(
  parsedOverview?: string,
  observedInstruments?: string[],
  observedMaterials?: string[],
  durationMs?: number
): string {
  const isShortVideo = durationMs !== undefined && durationMs <= 20000;
  
  // If parsed overview exists and is substantial (>= 50 chars), use it as base
  if (parsedOverview && parsedOverview.trim().length >= 50) {
    let enhanced = parsedOverview.trim();
    
    // Add tools context if instruments/materials available
    if (observedInstruments && observedInstruments.length > 0) {
      const toolsList = observedInstruments.slice(0, 3).join(', ');
      if (!enhanced.toLowerCase().includes(toolsList.toLowerCase())) {
        enhanced += ` Tools observed: ${toolsList}.`;
      }
    }
    
    return enhanced;
  }
  
  // Generate template-based overview for short/generic cases
  // Check if training model (banana) is present
  const isTrainingModel = observedMaterials?.some(m => m.toLowerCase().includes('banana')) || false;
  const materialContext = isTrainingModel ? 'training model (e.g., banana)' : 'tissue simulation';
  
  // Build template sentences
  const sentences: string[] = [];
  
  if (isShortVideo) {
    sentences.push(
      `This short skills clip demonstrates fundamental instrument handling and tissue simulation work on a ${materialContext}.`,
      'Emphasis is on controlled cutting, steady retraction, and basic suture mechanics rather than procedural completion.',
      'Focus feedback on precision, minimizing unnecessary tissue disturbance, and maintaining visualization.'
    );
  } else {
    sentences.push(
      `This procedure demonstrates focused surgical technique with attention to instrument control and tissue handling.`,
      'Key technical themes include controlled dissection, proper retraction, and maintaining clear visualization throughout the case.',
      'Execution emphasizes precision and adherence to fundamental surgical principles.'
    );
  }
  
  // Add tools context if available
  if (observedInstruments && observedInstruments.length > 0) {
    const toolsList = observedInstruments.slice(0, 3).join(', ');
    sentences.push(`Tools observed: ${toolsList}.`);
  }
  
  return sentences.join(' ');
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

  // Parse all notes to get observation texts (no verbatim reuse)
  const allLogs: string[] = [];
  for (const note of notes) {
    const parsed = parseOvershootOutput(note);
    allLogs.push(...parsed.observations.map(obs => obs.text));
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

  // Parse all notes to get observation texts (ignore MOMENT items for key concepts)
  const allLogs: string[] = [];
  for (const note of notes) {
    const parsed = parseOvershootOutput(note);
    allLogs.push(...parsed.observations.map(obs => obs.text));
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
  
  // Ensure 4-8 concepts, verb-first, no trivial variations
  // Filter to ensure verb-first (concept should start with an action verb) and ≤8 words
  const filteredConcepts = concepts
    .filter(c => {
      const words = c.split(/\s+/);
      if (words.length === 0 || words.length > 8) return false;
      const firstWord = words[0].toLowerCase().replace(/[^\w]/g, '');
      // Check if first word is an action verb
      return actionVerbs.includes(firstWord);
    });
  
  // Final deduplication: remove any remaining near-duplicates
  const finalConcepts: string[] = [];
  const seenNormalizedFinal = new Set<string>();
  for (const concept of filteredConcepts) {
    const normalized = normalize(concept);
    let isDuplicate = false;
    for (const existing of finalConcepts) {
      if (similarity(tokenize(concept), tokenize(existing)) >= 0.75) {
        isDuplicate = true;
        break;
      }
    }
    if (!isDuplicate && !seenNormalizedFinal.has(normalized)) {
      finalConcepts.push(concept);
      seenNormalizedFinal.add(normalized);
    }
  }
  
  // Return 4-8 concepts (don't fabricate if we have fewer)
  return finalConcepts.slice(0, 8);
}

/**
 * Extract 0-5 Notable Moments from notes with timestamps.
 * 
 * Requirements:
 * - 0-5 items (not forced to have moments)
 * - Timestamps come from video.currentTime (attached in code, not from model)
 * - Format: "mm:ss – <insight>" if timestamp exists
 * - Do NOT trust model-provided timestamps (they may be hallucinated)
 * - Promote logs with strong surgical keywords (hemostasis, cautery, dissection plane, etc.)
 * 
 * Strategy:
 * - Look for logs containing important surgical technique keywords
 * - Promote those to "Notable Moments" with their code-attached timestamps
 * - Dedupe aggressively to avoid repetition
 * 
 * Notes format: Array of objects { text: string, timestamp: number, type: 'LOG' | 'MOMENT' } or strings
 */
export function extractNotableMoments(notes: (string | { text: string; timestamp?: number; type?: 'LOG' | 'MOMENT' })[]): string[] {
  if (notes.length === 0) return [];
  
  // Strong surgical keywords that indicate notable technique moments
  // These keywords signal important surgical actions or techniques worth highlighting
  const notableKeywords = [
    'hemostasis', 'cautery', 'bipolar', 'electrocautery',
    'dissection plane', 'tissue plane', 'surgical plane',
    'counter-traction', 'counter traction', 'counterpressure',
    'vessel', 'vascular', 'artery', 'vein', 'bleeding',
    'clip', 'hemoclip', 'vascular clip',
    'suture', 'suturing', 'stitch', 'knot', 'tying',
    'needle driver', 'needle holder', 'needledriver',
    'exposure', 'critical exposure', 'visualization',
    'retraction', 'strategic retraction', 'tissue retraction',
    'ligation', 'tying off', 'securing',
    'dissection', 'sharp dissection', 'blunt dissection',
    'incision', 'key incision', 'entry point',
    'anastomosis', 'reconstruction',
    'error-prevention', 'avoiding', 'preventing',
    'critical', 'significant', 'important technique',
  ];
  
  const moments: Array<{ text: string; timestamp: number; score: number }> = [];
  const seen = new Set<string>();
  
  // Process notes: promote logs with notable keywords to moments
  for (const note of notes) {
    let text: string;
    let timestamp: number | undefined;
    
    if (typeof note === 'object') {
      text = note.text;
      timestamp = note.timestamp;
    } else {
      text = note;
      // Parse MOMENT from text if present (though we'll prioritize keyword-based promotion)
      const parsed = parseOvershootOutput(text);
      if (parsed.notableMoments.length > 0) {
        const moment = parsed.notableMoments[0];
        text = moment.text;
        // Use timestamp from parsed moment if available and valid (convert ms to seconds)
        if (moment.timestampMs > 1000) {
          timestamp = moment.timestampMs / 1000; // Convert milliseconds to seconds
        }
      }
    }
    
    // Remove any model-provided timestamps from text
    text = text.replace(/^\d+[:\d]*[sm]?\s*[-–]?\s*/i, '').trim();
    
    if (!text) continue;
    
    const normalized = normalize(text);
    if (seen.has(normalized)) continue;
    
    // Only include if we have a valid timestamp (code-attached, never from model)
    // Require timestamp > 1 second to avoid 0:00 duplicates
    if (timestamp === undefined || timestamp <= 1) continue;
    
    // Score based on notable keyword matches (higher score = more notable)
    const lowerText = text.toLowerCase();
    let score = 0;
    for (const keyword of notableKeywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }
    
    // Promote logs with at least one notable keyword (score > 0)
    // Require minimum score of 1 (at least one notable keyword)
    if (score > 0) {
      moments.push({ text, timestamp, score });
      seen.add(normalized);
    }
  }
  
  // Sort by score (higher = more notable keywords), then by timestamp
  moments.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score; // Higher score first
    return a.timestamp - b.timestamp; // Then by chronological order
  });
  
  // Deduplicate by timestamp: if multiple moments share the same timestamp, keep only the highest-scored one
  const timestampMap = new Map<number, { text: string; timestamp: number; score: number }>();
  for (const moment of moments) {
    const existing = timestampMap.get(moment.timestamp);
    if (!existing || moment.score > existing.score) {
      timestampMap.set(moment.timestamp, moment);
    }
  }
  
  // Format and return 0-4 moments with timestamps (code-attached only, truly distinct)
  const distinctMoments = Array.from(timestampMap.values())
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return a.timestamp - b.timestamp;
    })
    .slice(0, 4); // Max 4 moments as per requirement
  
  const formattedMoments = distinctMoments.map(({ text, timestamp }) => {
      const timeStr = formatTimestamp(timestamp);
      return `${timeStr} – ${text}`;
    });
  
  return formattedMoments; // Can be 0-4 items
}

/**
 * Format timestamp (seconds) as MM:SS
 */
function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Key Concept Bank - Prewritten high-quality concepts to supplement Overshoot-derived concepts
 * Each concept must be <= 8 words, verb-first, and include filtering metadata
 */
export const KEY_CONCEPT_BANK: Array<{
  id: string;
  text: string;
  tags: string[];
  requires?: string[];
  forbids?: string[];
}> = [
  // General technique concepts
  { id: 'gc1', text: 'Shorten instrument travel', tags: ['general', 'motion'], requires: [], forbids: [] },
  { id: 'gc2', text: 'Stabilize tissue before cutting', tags: ['tissue', 'general'], requires: [], forbids: [] },
  { id: 'gc3', text: 'Reset exposure before advancing', tags: ['exposure', 'general'], requires: [], forbids: [] },
  { id: 'gc4', text: 'Control traction–countertraction', tags: ['tissue', 'general'], requires: [], forbids: [] },
  { id: 'gc5', text: 'Pause if anatomy is unclear', tags: ['safety', 'general'], requires: [], forbids: [] },
  { id: 'gc6', text: 'Keep working edge in view', tags: ['exposure', 'general'], requires: [], forbids: [] },
  { id: 'gc7', text: 'Reposition instead of forcing the plane', tags: ['tissue', 'general'], requires: [], forbids: [] },
  { id: 'gc8', text: 'Maintain clear field visualization', tags: ['exposure', 'general'], requires: [], forbids: [] },
  { id: 'gc9', text: 'Minimize unnecessary tissue manipulation', tags: ['tissue', 'general'], requires: [], forbids: [] },
  { id: 'gc10', text: 'Plan instrument transitions in advance', tags: ['general', 'motion'], requires: [], forbids: [] },
  
  // Tool-specific concepts (scissors)
  { id: 'sc1', text: 'Use short scissor bites', tags: ['scissors', 'technique'], requires: ['scissors'], forbids: [] },
  { id: 'sc2', text: 'Advance scissors along tissue plane', tags: ['scissors', 'tissue'], requires: ['scissors'], forbids: [] },
  { id: 'sc3', text: 'Keep scissor tips visible during cutting', tags: ['scissors', 'exposure'], requires: ['scissors'], forbids: [] },
  
  // Tool-specific concepts (forceps)
  { id: 'fp1', text: 'Grasp tissue with minimal forceps pressure', tags: ['forceps', 'tissue'], requires: ['forceps'], forbids: [] },
  { id: 'fp2', text: 'Release forceps tension periodically', tags: ['forceps', 'tissue'], requires: ['forceps'], forbids: [] },
  { id: 'fp3', text: 'Position forceps perpendicular to tissue plane', tags: ['forceps', 'tissue'], requires: ['forceps'], forbids: [] },
  
  // Tool-specific concepts (needle driver/suture)
  { id: 'nd1', text: 'Maintain needle angle consistency', tags: ['suture', 'needle driver'], requires: ['suture', 'needle driver'], forbids: [] },
  { id: 'nd2', text: 'Rotate needle driver through tissue arc', tags: ['suture', 'needle driver'], requires: ['suture', 'needle driver'], forbids: [] },
  { id: 'nd3', text: 'Pass needle perpendicular to tissue edge', tags: ['suture', 'needle driver'], requires: ['suture', 'needle driver'], forbids: [] },
  
  // Tool-specific concepts (retractor)
  { id: 'rt1', text: 'Adjust retractor position for optimal exposure', tags: ['retractor', 'exposure'], requires: ['retractor'], forbids: [] },
  { id: 'rt2', text: 'Avoid over-retraction of delicate tissue', tags: ['retractor', 'tissue', 'safety'], requires: ['retractor'], forbids: [] },
  
  // Safety and tissue handling
  { id: 'sh1', text: 'Avoid levering against fragile tissue', tags: ['safety', 'tissue'], requires: [], forbids: [] },
  { id: 'sh2', text: 'Identify tissue planes before dissection', tags: ['safety', 'tissue'], requires: [], forbids: [] },
  { id: 'sh3', text: 'Stop bleeding before proceeding', tags: ['safety', 'hemostasis'], requires: [], forbids: [] },
  
  // Simulation/training specific
  { id: 'sim1', text: 'Practice controlled movements on model', tags: ['simulation'], requires: ['banana'], forbids: [] },
  { id: 'sim2', text: 'Focus on precision over speed', tags: ['simulation', 'general'], requires: [], forbids: [] },
];

/**
 * Stable hash function for deterministic selection: string -> integer
 * Simple hash to ensure same input => same hash
 */
function stableHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Pick 1-2 key concepts from bank to supplement existing concepts
 * Deterministic selection based on video seed; filters by observed instruments/materials
 */
export function pickBankConcepts({
  existingConcepts,
  observedInstruments = [],
  observedMaterials = [],
  videoIdSeed,
  count
}: {
  existingConcepts: string[];
  observedInstruments?: string[];
  observedMaterials?: string[];
  videoIdSeed: string;
  count: number;
}): string[] {
  if (count <= 0) return [];
  
  // Normalize observed items to lowercase for matching
  const observedSet = new Set<string>();
  for (const item of observedInstruments) {
    observedSet.add(item.toLowerCase().trim());
  }
  for (const item of observedMaterials) {
    observedSet.add(item.toLowerCase().trim());
  }
  
  // Compute existing concept signatures for deduplication
  const existingSignatures = new Set<string>();
  for (const concept of existingConcepts) {
    const sig = conceptSignature(concept);
    if (sig) {
      existingSignatures.add(sig);
    }
  }
  
  // Filter bank candidates
  const candidates = KEY_CONCEPT_BANK.filter(candidate => {
    // Check requires: all required tokens must be present
    if (candidate.requires && candidate.requires.length > 0) {
      const allPresent = candidate.requires.every(req => {
        const reqLower = req.toLowerCase();
        // Check if req appears in observed set (exact match) or as substring in tags
        return observedSet.has(reqLower) || 
               Array.from(observedSet).some(obs => obs.includes(reqLower) || reqLower.includes(obs));
      });
      if (!allPresent) return false;
    }
    
    // Check forbids: none may be present
    if (candidate.forbids && candidate.forbids.length > 0) {
      const anyForbidden = candidate.forbids.some(forbid => {
        const forbidLower = forbid.toLowerCase();
        return observedSet.has(forbidLower) ||
               Array.from(observedSet).some(obs => obs.includes(forbidLower) || forbidLower.includes(obs));
      });
      if (anyForbidden) return false;
    }
    
    // Check tags: if candidate mentions specific instruments in tags, require they be present
    // Only enforce if requires is empty (allows general concepts without specific tools)
    if (candidate.requires && candidate.requires.length === 0) {
      const toolTags = candidate.tags.filter(tag => 
        ['scissors', 'forceps', 'suture', 'needle driver', 'retractor'].includes(tag.toLowerCase())
      );
      if (toolTags.length > 0) {
        // At least one tool tag must match observed instruments
        const hasMatchingTool = toolTags.some(tag => {
          const tagLower = tag.toLowerCase();
          return observedSet.has(tagLower) ||
                 Array.from(observedSet).some(obs => obs.includes(tagLower) || tagLower.includes(obs));
        });
        if (!hasMatchingTool) return false;
      }
    }
    
    // Dedup: reject if concept signature overlaps with existing concepts
    const candidateSig = conceptSignature(candidate.text);
    if (candidateSig && existingSignatures.has(candidateSig)) {
      return false;
    }
    
    // Check word count: must be <= 8 words
    const wordCount = candidate.text.trim().split(/\s+/).length;
    if (wordCount > 8) return false;
    
    return true;
  });
  
  if (candidates.length === 0) return [];
  
  // Deterministic selection: sort by hash(videoIdSeed + candidate.id), take first N
  const candidatesWithHash = candidates.map(c => ({
    ...c,
    hash: stableHash(videoIdSeed + c.id)
  }));
  
  candidatesWithHash.sort((a, b) => a.hash - b.hash);
  
  const picked = candidatesWithHash.slice(0, count).map(c => c.text);
  
  // Dev log
  if (typeof console !== 'undefined') {
    console.log("[key-bank] picked", picked, "existing", existingConcepts.slice(0, 3), "observed instruments", observedInstruments, "materials", observedMaterials);
  }
  
  return picked;
}
