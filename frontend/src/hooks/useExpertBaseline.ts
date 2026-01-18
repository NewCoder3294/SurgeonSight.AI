/**
 * useExpertBaseline - Stores expert video analysis results for live comparison
 * 
 * When an expert video is analyzed via Overshoot, this hook stores the key metrics
 * that will be used to compare against the student's live performance.
 */

import { useState, useCallback, useMemo } from 'react';

export interface ExpertMetrics {
    // Angle targets derived from analysis
    angleTarget: number;
    angleMin: number;
    angleMax: number;
    angleTolerance: number;

    // Grip expectations
    expectedGripType: 'pencil' | 'power' | 'unknown';

    // Steadiness baseline
    steadinessTarget: number;

    // Key technique notes from analysis
    techniqueNotes: string[];

    // Notable moments with timestamps
    notableMoments: Array<{ time: number; note: string }>;
}

export interface ExpertBaseline {
    procedureName: string;
    metrics: ExpertMetrics;
    rawNotes: string[];
    analyzedAt: number;
}

// Default baseline when no expert video is analyzed
const DEFAULT_METRICS: ExpertMetrics = {
    angleTarget: 45,
    angleMin: 30,
    angleMax: 60,
    angleTolerance: 15,
    expectedGripType: 'pencil',
    steadinessTarget: 70,
    techniqueNotes: [
        'Maintain steady hand position',
        'Use pencil grip for precision',
        'Keep angle between 30-60 degrees'
    ],
    notableMoments: []
};

/**
 * Parse analysis notes to extract metrics
 */
function parseNotesToMetrics(notes: string[]): Partial<ExpertMetrics> {
    const extracted: Partial<ExpertMetrics> = {
        techniqueNotes: [],
        notableMoments: []
    };

    // Extract angle mentions
    const anglePattern = /(\d+)\s*(?:degrees?|°)/gi;
    const angles: number[] = [];

    notes.forEach(note => {
        const matches = note.match(anglePattern);
        if (matches) {
            matches.forEach(match => {
                const num = parseInt(match);
                if (num > 0 && num < 180) {
                    angles.push(num);
                }
            });
        }

        // Check for grip type mentions
        if (/pencil\s*grip/i.test(note)) {
            extracted.expectedGripType = 'pencil';
        } else if (/power\s*grip/i.test(note)) {
            extracted.expectedGripType = 'power';
        }

        // Add as technique note if it's instructional
        if (note.length > 10 && note.length < 200) {
            extracted.techniqueNotes!.push(note);
        }
    });

    // Calculate angle targets from extracted angles
    if (angles.length > 0) {
        const sum = angles.reduce((a, b) => a + b, 0);
        extracted.angleTarget = Math.round(sum / angles.length);
        extracted.angleMin = Math.min(...angles);
        extracted.angleMax = Math.max(...angles);
        extracted.angleTolerance = Math.round((extracted.angleMax - extracted.angleMin) / 2) || 15;
    }

    return extracted;
}

export function useExpertBaseline() {
    const [baseline, setBaseline] = useState<ExpertBaseline | null>(null);
    const [isStored, setIsStored] = useState(false);

    /**
     * Store expert analysis as baseline for comparison
     */
    const storeBaseline = useCallback((
        procedureName: string,
        notes: string[],
        analysisResult?: { summary: string; keyConcepts: string[]; notableMoments: string[] }
    ) => {
        // Parse notes to extract metrics
        const parsedMetrics = parseNotesToMetrics(notes);

        // Parse notable moments
        const moments: Array<{ time: number; note: string }> = [];
        if (analysisResult?.notableMoments) {
            analysisResult.notableMoments.forEach((moment, index) => {
                // Try to extract time from moment text
                const timeMatch = moment.match(/\[?([\d.]+)s?\]?/);
                const time = timeMatch ? parseFloat(timeMatch[1]) : index * 10;
                moments.push({ time, note: moment });
            });
        }

        const metrics: ExpertMetrics = {
            ...DEFAULT_METRICS,
            ...parsedMetrics,
            notableMoments: moments
        };

        const newBaseline: ExpertBaseline = {
            procedureName,
            metrics,
            rawNotes: notes,
            analyzedAt: Date.now()
        };

        setBaseline(newBaseline);
        setIsStored(true);

        console.log('✅ Expert baseline stored:', newBaseline);

        return newBaseline;
    }, []);

    /**
     * Compare current metrics to expert baseline
     * Returns coaching feedback based on deviation
     */
    const compareToBaseline = useCallback((currentMetrics: {
        scalpelAngle: number;
        steadiness: number;
        gripType: 'pencil' | 'power' | 'unknown';
    }): {
        isOnTrack: boolean;
        deviations: string[];
        urgentMessage: string | null;
    } => {
        if (!baseline) {
            return { isOnTrack: true, deviations: [], urgentMessage: null };
        }

        const { metrics } = baseline;
        const deviations: string[] = [];
        let urgentMessage: string | null = null;

        // Check angle deviation
        const angleDiff = Math.abs(currentMetrics.scalpelAngle - metrics.angleTarget);
        if (angleDiff > metrics.angleTolerance * 2) {
            // Major deviation - urgent
            const direction = currentMetrics.scalpelAngle > metrics.angleTarget ? 'lower' : 'higher';
            urgentMessage = `Adjust angle! You're at ${Math.round(currentMetrics.scalpelAngle)} degrees. Target is ${metrics.angleTarget} degrees. Go ${direction}.`;
            deviations.push(`Angle: ${Math.round(currentMetrics.scalpelAngle)}° (target: ${metrics.angleTarget}°)`);
        } else if (angleDiff > metrics.angleTolerance) {
            // Minor deviation
            deviations.push(`Angle slightly off: ${Math.round(currentMetrics.scalpelAngle)}° vs target ${metrics.angleTarget}°`);
        }

        // Check grip type
        if (metrics.expectedGripType !== 'unknown' && currentMetrics.gripType !== 'unknown') {
            if (currentMetrics.gripType !== metrics.expectedGripType) {
                deviations.push(`Switch to ${metrics.expectedGripType} grip for this technique`);
                if (!urgentMessage) {
                    urgentMessage = `Use ${metrics.expectedGripType} grip! Expert uses ${metrics.expectedGripType} grip for this procedure.`;
                }
            }
        }

        // Check steadiness
        if (currentMetrics.steadiness < metrics.steadinessTarget - 20) {
            deviations.push(`Steadiness low: ${Math.round(currentMetrics.steadiness)}% (target: ${metrics.steadinessTarget}%+)`);
            if (!urgentMessage) {
                urgentMessage = `Stabilize your hand! Steadiness at ${Math.round(currentMetrics.steadiness)} percent. Target is ${metrics.steadinessTarget} percent.`;
            }
        }

        return {
            isOnTrack: deviations.length === 0,
            deviations,
            urgentMessage
        };
    }, [baseline]);

    /**
     * Clear stored baseline
     */
    const clearBaseline = useCallback(() => {
        setBaseline(null);
        setIsStored(false);
    }, []);

    // Memoize the metrics for quick access
    const expertMetrics = useMemo(() => baseline?.metrics || DEFAULT_METRICS, [baseline]);

    return {
        baseline,
        expertMetrics,
        isStored,
        storeBaseline,
        compareToBaseline,
        clearBaseline
    };
}

export default useExpertBaseline;
