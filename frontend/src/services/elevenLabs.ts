/**
 * ElevenLabs Voice Synthesis Service
 * 
 * High-quality AI voice synthesis for surgical coaching feedback.
 * Falls back to Web Speech API if ElevenLabs is unavailable.
 */

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Default voice IDs from ElevenLabs
// You can find more at: https://api.elevenlabs.io/v1/voices
export const VOICE_IDS = {
  // Professional, clear voices good for coaching
  rachel: '21m00Tcm4TlvDq8ikWAM',      // Rachel - warm, professional female
  drew: '29vD33N1CtxCmqQRPOHJ',        // Drew - confident male
  clyde: '2EiwWnXFnvU5JabPnv8n',       // Clyde - deep, authoritative male
  domi: 'AZnzlk1XvdvUeBnXmlld',        // Domi - strong, clear female
  dave: 'CYw3kZ02Hs0563khs1Fj',        // Dave - conversational male
  fin: 'D38z5RcWu1voky8WS1ja',         // Fin - energetic male
  sarah: 'EXAVITQu4vr4xnSDxMaL',       // Sarah - soft, professional female
  antoni: 'ErXwobaYiN019PkySvjV',      // Antoni - well-rounded male
  elli: 'MF3mGyEYCl7XYWbV9V6O',        // Elli - young, clear female
  josh: 'TxGEqnHWrfWFTfGW9XjX',        // Josh - deep, narrative male
  arnold: 'VR6AewLTigWG4xSOukaG',      // Arnold - crisp, professional male
  adam: 'pNInz6obpgDQGcFmaJgB',        // Adam - deep, clear male
  sam: 'yoZ06aMxZJJ28mfd3POQ',         // Sam - dynamic male
} as const;

export type VoiceId = keyof typeof VOICE_IDS;

export interface ElevenLabsConfig {
  voiceId?: VoiceId | string;
  modelId?: string;
  stability?: number;      // 0-1, lower = more expressive
  similarityBoost?: number; // 0-1, higher = closer to original voice
  style?: number;          // 0-1, style exaggeration
  speakerBoost?: boolean;  // Boost speaker clarity
}

export interface SpeakOptions extends ElevenLabsConfig {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

const DEFAULT_CONFIG: ElevenLabsConfig = {
  voiceId: 'rachel',  // Professional female voice - good for coaching
  modelId: 'eleven_flash_v2_5',  // Flash model for faster, snappier speech
  stability: 0.35,  // Lower stability = more dynamic/energetic delivery
  similarityBoost: 0.8,
  style: 0.15,  // Slight style boost for more expressive delivery
  speakerBoost: true,
};

/**
 * Check if ElevenLabs API is configured
 */
export function isElevenLabsConfigured(): boolean {
  return !!ELEVENLABS_API_KEY && ELEVENLABS_API_KEY.length > 10;
}

/**
 * Get API key info (for debugging - doesn't expose full key)
 */
export function getElevenLabsKeyInfo(): { configured: boolean; prefix: string } {
  if (!ELEVENLABS_API_KEY) {
    return { configured: false, prefix: '' };
  }
  return {
    configured: true,
    prefix: ELEVENLABS_API_KEY.substring(0, 8) + '...',
  };
}

/**
 * Text-to-Speech using ElevenLabs API
 * Returns audio blob or null if failed
 */
export async function textToSpeech(
  text: string,
  config: ElevenLabsConfig = {}
): Promise<Blob | null> {
  if (!isElevenLabsConfigured()) {
    console.warn('[ElevenLabs] API key not configured');
    return null;
  }

  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const voiceId = typeof mergedConfig.voiceId === 'string' && mergedConfig.voiceId in VOICE_IDS
    ? VOICE_IDS[mergedConfig.voiceId as VoiceId]
    : mergedConfig.voiceId || VOICE_IDS.rachel;

  try {
    const response = await fetch(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: mergedConfig.modelId,
          voice_settings: {
            stability: mergedConfig.stability,
            similarity_boost: mergedConfig.similarityBoost,
            style: mergedConfig.style,
            use_speaker_boost: mergedConfig.speakerBoost,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ElevenLabs] API error:', response.status, errorText);
      
      // Check for quota/rate limit errors
      if (response.status === 429) {
        throw new Error('ElevenLabs rate limit exceeded');
      }
      if (response.status === 401) {
        throw new Error('Invalid ElevenLabs API key');
      }
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const audioBlob = await response.blob();
    console.log(`[ElevenLabs] Generated audio: ${(audioBlob.size / 1024).toFixed(1)}KB`);
    return audioBlob;
  } catch (error) {
    console.error('[ElevenLabs] Failed to generate speech:', error);
    return null;
  }
}

/**
 * Text-to-Speech with streaming (lower latency)
 * Returns a ReadableStream of audio chunks
 */
export async function textToSpeechStream(
  text: string,
  config: ElevenLabsConfig = {}
): Promise<ReadableStream<Uint8Array> | null> {
  if (!isElevenLabsConfigured()) {
    console.warn('[ElevenLabs] API key not configured');
    return null;
  }

  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const voiceId = typeof mergedConfig.voiceId === 'string' && mergedConfig.voiceId in VOICE_IDS
    ? VOICE_IDS[mergedConfig.voiceId as VoiceId]
    : mergedConfig.voiceId || VOICE_IDS.rachel;

  try {
    const response = await fetch(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: mergedConfig.modelId,
          voice_settings: {
            stability: mergedConfig.stability,
            similarity_boost: mergedConfig.similarityBoost,
            style: mergedConfig.style,
            use_speaker_boost: mergedConfig.speakerBoost,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error('[ElevenLabs] Stream API error:', response.status);
      return null;
    }

    return response.body;
  } catch (error) {
    console.error('[ElevenLabs] Failed to stream speech:', error);
    return null;
  }
}

/**
 * ElevenLabs Voice Speaker class
 * Manages audio playback with queue and fallback to Web Speech API
 */
export class ElevenLabsSpeaker {
  private config: ElevenLabsConfig;
  private _audioContext: AudioContext | null = null;  // Reserved for future audio processing
  private currentAudio: HTMLAudioElement | null = null;
  private queue: Array<{ text: string; options: SpeakOptions }> = [];
  private isProcessing = false;
  private isSpeaking = false;
  private useWebSpeechFallback = false;
  private webSpeechSynth: SpeechSynthesis | null = null;

  constructor(config: ElevenLabsConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Check if ElevenLabs is available
    if (!isElevenLabsConfigured()) {
      console.log('[ElevenLabsSpeaker] No API key, will use Web Speech fallback');
      this.useWebSpeechFallback = true;
    }

    // Initialize Web Speech API for fallback
    if (typeof window !== 'undefined') {
      this.webSpeechSynth = window.speechSynthesis;
    }
  }

  /**
   * Check if currently speaking
   */
  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * Update voice configuration
   */
  setConfig(config: Partial<ElevenLabsConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Set the voice by ID or name
   */
  setVoice(voiceId: VoiceId | string): void {
    this.config.voiceId = voiceId;
  }

  /**
   * Speak text with ElevenLabs, falling back to Web Speech if needed
   */
  async speak(text: string, options: SpeakOptions = {}): Promise<void> {
    // Add to queue
    this.queue.push({ text, options });
    
    // Process queue if not already processing
    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  /**
   * Process the speech queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const { text, options } = this.queue.shift()!;
      await this.speakItem(text, options);
    }

    this.isProcessing = false;
  }

  /**
   * Speak a single item
   */
  private async speakItem(text: string, options: SpeakOptions): Promise<void> {
    this.isSpeaking = true;
    options.onStart?.();

    try {
      // Try ElevenLabs first
      if (!this.useWebSpeechFallback) {
        const success = await this.speakWithElevenLabs(text, options);
        if (success) {
          this.isSpeaking = false;
          options.onEnd?.();
          return;
        }
        // If ElevenLabs failed, fall back to Web Speech
        console.log('[ElevenLabsSpeaker] Falling back to Web Speech');
      }

      // Web Speech fallback
      await this.speakWithWebSpeech(text);
      this.isSpeaking = false;
      options.onEnd?.();
    } catch (error) {
      this.isSpeaking = false;
      options.onError?.(error as Error);
    }
  }

  /**
   * Speak using ElevenLabs API
   */
  private async speakWithElevenLabs(text: string, options: SpeakOptions): Promise<boolean> {
    const mergedConfig = { ...this.config, ...options };
    
    const audioBlob = await textToSpeech(text, mergedConfig);
    if (!audioBlob) return false;

    return new Promise((resolve) => {
      const audioUrl = URL.createObjectURL(audioBlob);
      this.currentAudio = new Audio(audioUrl);
      
      this.currentAudio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        this.currentAudio = null;
        resolve(true);
      };

      this.currentAudio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        this.currentAudio = null;
        resolve(false);
      };

      this.currentAudio.play().catch(() => resolve(false));
    });
  }

  /**
   * Speak using Web Speech API (fallback)
   */
  private speakWithWebSpeech(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.webSpeechSynth) {
        reject(new Error('Web Speech API not available'));
        return;
      }

      // Cancel any ongoing speech
      this.webSpeechSynth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Try to find a good voice
      const voices = this.webSpeechSynth.getVoices();
      const preferredVoice = voices.find(v =>
        v.name.includes('Samantha') ||
        v.name.includes('Karen') ||
        v.name.includes('Daniel') ||
        v.name.includes('Google') ||
        (v.lang.startsWith('en') && v.localService)
      ) || voices.find(v => v.lang.startsWith('en'));

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve(); // Resolve anyway to continue

      this.webSpeechSynth.speak(utterance);

      // Fallback timeout
      setTimeout(resolve, text.length * 60 + 2000);
    });
  }

  /**
   * Stop current speech and clear queue
   */
  stop(): void {
    this.queue = [];
    
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }

    this.webSpeechSynth?.cancel();
    this.isSpeaking = false;
    this.isProcessing = false;
  }

  /**
   * Skip current speech item but continue queue
   */
  skip(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    this.webSpeechSynth?.cancel();
    this.isSpeaking = false;
  }

  /**
   * Get available ElevenLabs voices
   */
  static async getVoices(): Promise<Array<{ voice_id: string; name: string }>> {
    if (!isElevenLabsConfigured()) {
      return [];
    }

    try {
      const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.voices || [];
    } catch {
      return [];
    }
  }
}

// Create a default speaker instance
let defaultSpeaker: ElevenLabsSpeaker | null = null;

export function getDefaultSpeaker(): ElevenLabsSpeaker {
  if (!defaultSpeaker) {
    defaultSpeaker = new ElevenLabsSpeaker();
  }
  return defaultSpeaker;
}

/**
 * Simple speak function using default speaker
 */
export async function speak(text: string, options?: SpeakOptions): Promise<void> {
  return getDefaultSpeaker().speak(text, options);
}

/**
 * Stop all speech
 */
export function stopSpeaking(): void {
  getDefaultSpeaker().stop();
}
