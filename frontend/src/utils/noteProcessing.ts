/**
 * Note Processing Utilities
 * 
 * Handles deduplication and extraction of summary/key concepts from accumulated notes.
 */

/**
 * Deduplicate notes: remove exact duplicates and near-duplicates.
 * Uses simple similarity heuristic: if one note contains >80% of another's words, consider it duplicate.
 */
export function deduplicateNotes(notes: string[]): string[] {
  const unique: string[] = [];
  const seenExact = new Set<string>();

  for (const note of notes) {
    const normalized = note.trim().toLowerCase();
    
    // Skip exact duplicates (case-insensitive)
    if (seenExact.has(normalized)) {
      continue;
    }

    // Check for near-duplicates (simple word overlap heuristic)
    const noteWords = new Set(normalized.split(/\s+/).filter(w => w.length > 3));
    let isDuplicate = false;

    for (const existing of unique) {
      const existingWords = new Set(existing.toLowerCase().split(/\s+/).filter(w => w.length > 3));
      const overlap = [...noteWords].filter(w => existingWords.has(w)).length;
      const similarity = overlap / Math.max(noteWords.size, existingWords.size);

      // If >80% word overlap, consider duplicate
      if (similarity > 0.8) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      unique.push(note);
      seenExact.add(normalized);
    }
  }

  return unique;
}

/**
 * Extract a 2-3 sentence summary from accumulated notes.
 * Takes first few complete sentences that capture the main observations.
 */
export function extractSummary(notes: string[]): string {
  if (notes.length === 0) return '';

  const allText = notes.join(' ').trim();
  
  // Split into sentences (simple heuristic)
  const sentences = allText
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.length < 200); // Filter reasonable sentence length

  if (sentences.length === 0) {
    return notes[0] || '';
  }

  // Take first 2-3 sentences that provide good coverage
  const summarySentences = sentences.slice(0, 3);
  return summarySentences.join('. ').trim() + (summarySentences.length > 0 ? '.' : '');
}

/**
 * Extract 3-6 key concepts as short phrases (for chip display).
 * Looks for sentences/phrases that contain action words or technique terms.
 */
export function extractKeyConcepts(notes: string[]): string[] {
  if (notes.length === 0) return [];

  const allText = notes.join(' ').toLowerCase();
  
  // Extract meaningful phrases (sentences or bullet-like items)
  const phrases: string[] = [];
  
  // Split by sentences and bullets
  const candidates = allText
    .split(/[.!?•\-\n]+/)
    .map(p => p.trim())
    .filter(p => p.length > 15 && p.length < 120);

  // Key concept indicators
  const actionWords = ['maintain', 'demonstrate', 'show', 'focus', 'use', 'keep', 'ensure', 'avoid', 'control'];
  const techniqueTerms = ['technique', 'positioning', 'grip', 'angle', 'movement', 'approach', 'method', 'handling'];

  for (const candidate of candidates) {
    const hasAction = actionWords.some(word => candidate.includes(word));
    const hasTechnique = techniqueTerms.some(word => candidate.includes(word));
    
    if (hasAction || hasTechnique) {
      // Clean up and capitalize first letter
      const cleaned = candidate
        .replace(/^\w/, (m) => m.toUpperCase())
        .trim();
      
      if (cleaned && !phrases.includes(cleaned) && phrases.length < 6) {
        phrases.push(cleaned);
      }
    }
  }

  // If not enough found, take diverse first sentences as fallback
  if (phrases.length < 3) {
    const fallback = candidates
      .slice(0, 6)
      .map(c => c.replace(/^\w/, (m) => m.toUpperCase()).trim())
      .filter(c => c.length > 10);
    
    return [...new Set([...phrases, ...fallback])].slice(0, 6);
  }

  return phrases.slice(0, 6);
}

/**
 * Extract 0-4 notable moments (time-stamped or significant observations).
 * Looks for observations that mention specific techniques or important points.
 */
export function extractNotableMoments(notes: string[]): string[] {
  if (notes.length === 0) return [];

  const moments: string[] = [];
  const significantKeywords = ['excellent', 'notable', 'important', 'key', 'critical', 'significant', 'demonstrates', 'shows'];

  for (const note of notes) {
    const lower = note.toLowerCase();
    const hasSignificance = significantKeywords.some(keyword => lower.includes(keyword));
    
    if (hasSignificance && moments.length < 4) {
      const cleaned = note.trim();
      if (cleaned && !moments.includes(cleaned)) {
        moments.push(cleaned);
      }
    }
  }

  return moments;
}
