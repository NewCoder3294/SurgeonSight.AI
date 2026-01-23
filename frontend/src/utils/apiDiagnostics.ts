/**
 * API Diagnostics Utility
 * 
 * Checks which APIs are properly configured and logs status to console.
 * Call checkAllAPIs() on app startup to see what's working.
 */

import { isOvershootConfigured, getApiKeyInfo } from '../services/overshoot';
import { isElevenLabsConfigured, getElevenLabsKeyInfo } from '../services/elevenLabs';

interface APIStatus {
  name: string;
  configured: boolean;
  envVar: string;
  fallback: string;
  info?: string;
}

/**
 * Check all API configurations and return status
 */
export function checkAllAPIs(): APIStatus[] {
  const statuses: APIStatus[] = [];

  // 1. Overshoot (Video AI Analysis)
  const overshootInfo = getApiKeyInfo();
  statuses.push({
    name: 'Overshoot AI',
    configured: overshootInfo.configured,
    envVar: 'VITE_OVERSHOOT_API_KEY',
    fallback: 'None - panel will show "Connect Overshoot"',
    info: overshootInfo.configured ? `Key: ${overshootInfo.prefix}... (${overshootInfo.format})` : undefined,
  });

  // 2. ElevenLabs (Voice Synthesis)
  const elevenLabsInfo = getElevenLabsKeyInfo();
  statuses.push({
    name: 'ElevenLabs Voice',
    configured: elevenLabsInfo.configured,
    envVar: 'VITE_ELEVENLABS_API_KEY',
    fallback: 'Web Speech API (browser TTS)',
    info: elevenLabsInfo.configured ? `Key: ${elevenLabsInfo.prefix}` : undefined,
  });

  // 3. Backend API URL
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  statuses.push({
    name: 'Backend API',
    configured: true, // Always has default
    envVar: 'VITE_API_URL',
    fallback: 'Demo mode with local feedback',
    info: `URL: ${apiUrl}`,
  });

  // 4. WebSocket URL
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
  statuses.push({
    name: 'WebSocket',
    configured: true, // Always has default
    envVar: 'VITE_WS_URL',
    fallback: 'Local demo feedback',
    info: `URL: ${wsUrl}`,
  });

  return statuses;
}

/**
 * Log API status to console with nice formatting
 */
export function logAPIStatus(): void {
  const statuses = checkAllAPIs();
  
  console.log('%c╔═══════════════════════════════════════════════════════════╗', 'color: #c45c3e');
  console.log('%c║           SurgeonSight API Configuration Status           ║', 'color: #c45c3e');
  console.log('%c╠═══════════════════════════════════════════════════════════╣', 'color: #c45c3e');
  
  statuses.forEach(status => {
    const icon = status.configured ? '✓' : '✗';
    const color = status.configured ? 'color: #4a9f6e' : 'color: #e53935';
    console.log(`%c║ ${icon} ${status.name.padEnd(20)} ${status.configured ? 'CONFIGURED' : 'NOT SET'}`, color);
    if (status.info) {
      console.log(`%c║   ${status.info}`, 'color: #888');
    }
    if (!status.configured) {
      console.log(`%c║   Fallback: ${status.fallback}`, 'color: #ffa726');
      console.log(`%c║   Set: ${status.envVar}`, 'color: #888');
    }
  });
  
  console.log('%c╚═══════════════════════════════════════════════════════════╝', 'color: #c45c3e');
  
  const allConfigured = statuses.every(s => s.configured);
  if (!allConfigured) {
    console.log('%c⚠️  Some APIs are not configured. App will use fallbacks where available.', 'color: #ffa726; font-weight: bold');
    console.log('%c   Add missing keys to frontend/.env file and restart the dev server.', 'color: #888');
  } else {
    console.log('%c✓ All APIs configured!', 'color: #4a9f6e; font-weight: bold');
  }
}

/**
 * Check if a specific API is ready
 */
export function isAPIReady(apiName: 'overshoot' | 'elevenlabs' | 'backend'): boolean {
  switch (apiName) {
    case 'overshoot':
      return isOvershootConfigured();
    case 'elevenlabs':
      return isElevenLabsConfigured();
    case 'backend':
      return true; // Backend always has fallback
    default:
      return false;
  }
}

// Auto-log on import in development
if (import.meta.env.DEV) {
  // Delay to ensure everything is loaded
  setTimeout(() => {
    logAPIStatus();
  }, 1000);
}
