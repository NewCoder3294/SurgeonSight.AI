/**
 * Overshoot AI Video Analysis Service
 * 
 * Wrapper around @overshoot/sdk for clean integration.
 * Handles configuration, error states, and result normalization.
 */

import { RealtimeVision } from '@overshoot/sdk';

const API_KEY = import.meta.env.VITE_OVERSHOOT_API_KEY;
const API_URL = import.meta.env.VITE_OVERSHOOT_API_URL || 'https://cluster1.overshoot.ai/api/v0.2';

export interface OvershootConfig {
  prompt: string;
  file: File;
  onResult: (text: string) => void;
  onError?: (error: Error) => void;
  processing?: {
    clip_length_seconds?: number;
    delay_seconds?: number;
    fps?: number;
    sampling_ratio?: number;
  };
}

export interface OvershootInstance {
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

/**
 * Create and configure an Overshoot RealtimeVision instance.
 * Throws if API key is missing.
 */
export function createOvershootVision(config: OvershootConfig): OvershootInstance {
  if (!API_KEY) {
    throw new Error(
      'VITE_OVERSHOOT_API_KEY not found. Please set it in your .env file.\n' +
      'Example: VITE_OVERSHOOT_API_KEY=ovs_your_key_here'
    );
  }

  // Validate API key format (should start with 'ovs_')
  if (!API_KEY.startsWith('ovs_')) {
    console.warn('Overshoot API key format may be incorrect. Expected format: ovs_...');
  }

  // Log key presence (for debugging, but don't log full key)
  console.log('[Overshoot] API Key loaded:', API_KEY ? `${API_KEY.substring(0, 10)}...` : 'NOT FOUND');
  console.log('[Overshoot] API URL:', API_URL);

  const vision = new RealtimeVision({
    apiUrl: API_URL,
    apiKey: API_KEY,
    prompt: config.prompt,
    source: { type: 'video', file: config.file },
    processing: config.processing,
    onResult: (result: any) => {
      // Normalize various result formats
      const text = result.result || result.text || result.message || 
                   (typeof result === 'string' ? result : '');
      
      if (text && text.trim() && text !== '{}') {
        config.onResult(text.trim());
      }
    },
    onError: (error: any) => {
      // Enhanced error logging
      console.error('[Overshoot] API Error:', error);
      console.error('[Overshoot] Error details:', {
        message: error?.message,
        status: error?.status,
        response: error?.response,
        type: typeof error,
      });

      // Extract meaningful error message
      let errorMessage = 'Unknown error';
      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.status === 404 || errorMessage.toLowerCase().includes('not found')) {
        errorMessage = 'API endpoint not found. Please verify your API key is correct and account is active.';
      } else if (error?.status === 401 || errorMessage.toLowerCase().includes('unauthorized')) {
        errorMessage = 'Invalid API key. Please check VITE_OVERSHOOT_API_KEY in your .env file.';
      }

      const err = error instanceof Error ? error : new Error(errorMessage);
      err.message = errorMessage;
      
      if (config.onError) {
        config.onError(err);
      }
    },
  });

  return {
    start: () => vision.start(),
    stop: () => vision.stop().catch(() => {}), // Ignore stop errors
  };
}

/**
 * Check if Overshoot is configured (API key present)
 */
export function isOvershootConfigured(): boolean {
  return !!API_KEY;
}

/**
 * Get API key info (for debugging - doesn't expose full key)
 */
export function getApiKeyInfo(): { configured: boolean; format: 'valid' | 'invalid' | 'unknown'; prefix: string } {
  if (!API_KEY) {
    return { configured: false, format: 'unknown', prefix: '' };
  }
  
  const prefix = API_KEY.substring(0, Math.min(10, API_KEY.length));
  const format = API_KEY.startsWith('ovs_') ? 'valid' : 'invalid';
  
  return { configured: true, format, prefix };
}
