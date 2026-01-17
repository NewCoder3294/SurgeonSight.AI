interface ExpertSummaryPayload {
  procedure: string;
  stats: {
    angle_mean: number;
    angle_std: number;
    angle_min: number;
    angle_max: number;
    speed_mean: number;
    speed_std: number;
    jitter_mean: number;
  };
  segments: Array<{
    t_start: number;
    t_end: number;
    type: string;
  }>;
  style?: string;
}

interface ExpertSummaryResponse {
  summary: string;
}

export async function fetchExpertSummary(
  payload: ExpertSummaryPayload
): Promise<string> {
  const response = await fetch('http://localhost:8000/expert/summary', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      procedure: payload.procedure,
      stats: payload.stats,
      segments: payload.segments || [],
      style: 'concise',
    }),
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const data: ExpertSummaryResponse = await response.json();
  return data.summary;
}
