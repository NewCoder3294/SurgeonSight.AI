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
    console.log('');
    console.log('📝 To fix:');
    console.log('1. Create or edit frontend/.env');
    console.log('2. Add: VITE_OVERSHOOT_API_KEY=ovs_your_key_here');
    console.log('3. RESTART the dev server (npm run dev)');
  } else if (!apiKey.startsWith('ovs_')) {
    console.warn('⚠️ API key format may be incorrect. Expected format: ovs_...');
    console.log('Current prefix:', apiKey.substring(0, 10));
  } else {
    console.log('✅ API key is configured and format looks correct');
  }

  return result;
}

/**
 * Test the Overshoot API connection
 * Run this in browser console: window.testOvershootAPI()
 */
export async function testOvershootAPI() {
  const apiKey = import.meta.env.VITE_OVERSHOOT_API_KEY;
  const apiUrl = import.meta.env.VITE_OVERSHOOT_API_URL || 'https://cluster1.overshoot.ai/api/v0.2';

  console.log('=== Testing Overshoot API Connection ===');
  
  if (!apiKey) {
    console.error('❌ Cannot test - API key is missing');
    return { success: false, error: 'API key missing' };
  }

  console.log('API URL:', apiUrl);
  console.log('API Key:', apiKey.substring(0, 15) + '...');
  
  try {
    // Try to make a simple health check or minimal request
    const response = await fetch(apiUrl + '/health', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('Response status:', response.status);
    
    if (response.ok) {
      console.log('✅ API connection successful');
      return { success: true, status: response.status };
    } else {
      const text = await response.text();
      console.error('❌ API returned error:', response.status, text);
      
      if (response.status === 401) {
        console.log('');
        console.log('🔑 Invalid API key. Please check:');
        console.log('1. Key is correct in frontend/.env');
        console.log('2. Key is not expired');
        console.log('3. Key has proper permissions');
      } else if (response.status === 402) {
        console.log('');
        console.log('💳 Credits exhausted. Please:');
        console.log('1. Check your Overshoot dashboard');
        console.log('2. Add more credits to your account');
      }
      
      return { success: false, status: response.status, error: text };
    }
  } catch (err: any) {
    console.error('❌ Network error:', err.message);
    console.log('');
    console.log('🌐 Possible causes:');
    console.log('1. No internet connection');
    console.log('2. API server is down');
    console.log('3. CORS issues (check browser console)');
    return { success: false, error: err.message };
  }
}

// Make available in browser console for debugging
if (typeof window !== 'undefined') {
  (window as any).checkOvershootConfig = checkOvershootConfig;
  (window as any).testOvershootAPI = testOvershootAPI;
}
