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

const API_BASE = 'http://localhost:8000';

export async function fetchExpertSummary(
  payload: ExpertSummaryPayload
): Promise<string> {
  try {
    const response = await fetch(`${API_BASE}/expert/summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...payload,
        style: payload.style || 'concise',
      }),
    });

    if (!response.ok) {
      const status = response.status;
      throw new Error(`Request failed with status ${status}`);
    }

    const data: ExpertSummaryResponse = await response.json();
    return data.summary;
  } catch (error) {
    throw error;
  }
}
