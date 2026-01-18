/**
 * Debug utility to check Overshoot API key configuration
 * Run this in browser console: window.checkOvershootConfig()
 */

export function checkOvershootConfig() {
  const apiKey = import.meta.env.VITE_OVERSHOOT_API_KEY;
  const apiUrl = import.meta.env.VITE_OVERSHOOT_API_URL || 'https://cluster1.overshoot.ai/api/v0.2';

  const result = {
    configured: !!apiKey,
    keyPresent: apiKey ? 'Yes' : 'No',
    keyLength: apiKey?.length || 0,
    keyFormat: apiKey?.startsWith('ovs_') ? 'Valid (starts with ovs_)' : apiKey ? 'Invalid (should start with ovs_)' : 'N/A',
    keyPrefix: apiKey ? `${apiKey.substring(0, Math.min(15, apiKey.length))}...` : 'N/A',
    apiUrl,
    envVars: {
      'import.meta.env.VITE_OVERSHOOT_API_KEY': import.meta.env.VITE_OVERSHOOT_API_KEY ? 'Present' : 'Missing',
      'import.meta.env.VITE_OVERSHOOT_API_URL': import.meta.env.VITE_OVERSHOOT_API_URL || 'Using default',
    },
  };

  console.log('=== Overshoot API Configuration Check ===');
  console.table(result);
  
  if (!apiKey) {
    console.error('❌ API key is missing! Set VITE_OVERSHOOT_API_KEY in frontend/.env');
  } else if (!apiKey.startsWith('ovs_')) {
    console.warn('⚠️ API key format may be incorrect. Expected format: ovs_...');
    console.log('Current prefix:', apiKey.substring(0, 10));
  } else {
    console.log('✅ API key is configured and format looks correct');
  }

  return result;
}

// Make available in browser console for debugging
if (typeof window !== 'undefined') {
  (window as any).checkOvershootConfig = checkOvershootConfig;
}
