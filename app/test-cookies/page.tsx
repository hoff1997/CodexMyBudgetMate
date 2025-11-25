'use client';

export default function TestCookies() {
  const testFetch = async () => {
    console.log('🔵 [TEST] Starting API call test...');
    console.log('🔵 [TEST] Current cookies:', document.cookie);

    try {
      const response = await fetch('/api/envelopes');
      const data = await response.json();
      console.log('🟢 [TEST] Response status:', response.status);
      console.log('🟢 [TEST] Response data:', data);
      console.log('🟢 [TEST] Cookies after fetch:', document.cookie);
    } catch (error) {
      console.error('🔴 [TEST] Error:', error);
    }
  };

  const testMultipleEndpoints = async () => {
    console.log('🔵 [TEST] Testing multiple endpoints...');
    console.log('🔵 [TEST] Current cookies:', document.cookie);

    const endpoints = ['/api/accounts', '/api/transactions', '/api/goals', '/api/envelopes'];

    for (const endpoint of endpoints) {
      try {
        console.log(`🔵 [TEST] Calling ${endpoint}...`);
        const response = await fetch(endpoint);
        const data = await response.json();
        console.log(`${response.ok ? '🟢' : '🔴'} [TEST] ${endpoint} - Status: ${response.status}`, data);
      } catch (error) {
        console.error(`🔴 [TEST] ${endpoint} - Error:`, error);
      }
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Cookie & Fetch Wrapper Test</h1>

        <div className="space-y-4">
          <div className="p-4 bg-gray-100 rounded">
            <h2 className="font-semibold mb-2">Test Single Endpoint</h2>
            <button
              onClick={testFetch}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Test /api/envelopes
            </button>
          </div>

          <div className="p-4 bg-gray-100 rounded">
            <h2 className="font-semibold mb-2">Test All Endpoints</h2>
            <button
              onClick={testMultipleEndpoints}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Test All API Routes
            </button>
          </div>

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
            <h2 className="font-semibold mb-2">Instructions:</h2>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Open browser DevTools (F12)</li>
              <li>Go to Console tab</li>
              <li>Go to Network tab</li>
              <li>Click one of the test buttons above</li>
              <li>Check Console for detailed logs</li>
              <li>Check Network tab - click on the request and verify "Cookie" header is present</li>
              <li>Check Vercel logs - should show "cookies: sb-..." not "cookies: NONE"</li>
            </ol>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded">
            <h2 className="font-semibold mb-2">What to look for:</h2>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><strong>Browser Console:</strong> Should show current cookies and response data</li>
              <li><strong>Network Tab:</strong> Request should include "Cookie: sb-..." header</li>
              <li><strong>Response Status:</strong> Should be 200 (success) if authenticated, 401 if not</li>
              <li><strong>Vercel Logs:</strong> Should show cookies being received by the server</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
