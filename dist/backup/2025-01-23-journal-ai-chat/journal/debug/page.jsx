"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DebugPage;
const react_1 = require("react");
const card_1 = require("@/components/ui/card");
const button_1 = require("@/components/ui/button");
function DebugPage() {
    const [apiResponse, setApiResponse] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [mounted, setMounted] = (0, react_1.useState)(false);
    // Add immediate script execution test
    if (typeof window !== 'undefined') {
        console.log('=== DebugPage: Client-side code is running ===');
        window.debugPageLoaded = true;
    }
    // Check if component is mounted
    (0, react_1.useEffect)(() => {
        setMounted(true);
        console.log('DebugPage component mounted');
        // Add global error handler
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
            addLog(`Global error: ${e.error?.message || 'Unknown error'}`);
        });
        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled rejection:', e.reason);
            addLog(`Unhandled rejection: ${e.reason}`);
        });
    }, []);
    const addLog = (message) => {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] ${message}`);
    };
    const testJournalsAPI = async () => {
        setLoading(true);
        setError(null);
        setApiResponse(null);
        try {
            const response = await fetch('/api/journals?limit=5&skip=0');
            const data = await response.json();
            setApiResponse({
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries()),
                data: data
            });
            if (!response.ok) {
                setError(`API returned ${response.status}: ${response.statusText}`);
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error occurred');
            setApiResponse({
                error: err instanceof Error ? err.message : 'Unknown error',
                stack: err instanceof Error ? err.stack : undefined
            });
        }
        finally {
            setLoading(false);
        }
    };
    const testSimpleJournalsAPI = async () => {
        setLoading(true);
        setError(null);
        setApiResponse(null);
        try {
            const response = await fetch('/api/test-journals');
            const data = await response.json();
            setApiResponse({
                status: response.status,
                statusText: response.statusText,
                data: data
            });
            if (!response.ok) {
                setError(`Test API returned ${response.status}: ${response.statusText}`);
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error occurred');
        }
        finally {
            setLoading(false);
        }
    };
    const testMongoConnection = async () => {
        setLoading(true);
        setError(null);
        setApiResponse(null);
        try {
            const response = await fetch('/api/test-mongodb');
            const data = await response.json();
            setApiResponse({
                status: response.status,
                statusText: response.statusText,
                data: data
            });
            if (!response.ok) {
                setError(`MongoDB test failed: ${response.status}`);
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error occurred');
        }
        finally {
            setLoading(false);
        }
    };
    const checkEnvironment = async () => {
        setLoading(true);
        setError(null);
        setApiResponse(null);
        try {
            const response = await fetch('/api/env-check');
            const data = await response.json();
            setApiResponse({
                status: response.status,
                data: data
            });
            if (!response.ok) {
                setError(`Environment check failed: ${response.status}`);
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error occurred');
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Journal API Debug Page</h1>
      
      <div className="space-y-4 mb-6">
        <button_1.Button onClick={() => {
            console.log('Button clicked!');
            testJournalsAPI();
        }} disabled={loading}>
          Test /api/journals Endpoint
        </button_1.Button>
        
        <button_1.Button onClick={testSimpleJournalsAPI} disabled={loading} variant="outline">
          Test Simple Journals API
        </button_1.Button>
        
        <button_1.Button onClick={testMongoConnection} disabled={loading} variant="outline">
          Test MongoDB Connection
        </button_1.Button>
        
        <button_1.Button onClick={checkEnvironment} disabled={loading} variant="outline">
          Check Environment Variables
        </button_1.Button>
        
        {/* Native HTML button for testing */}
        <div className="mt-4 p-4 border rounded bg-yellow-50">
          <p className="text-sm mb-2">Native HTML Button Test:</p>
          <button onClick={() => {
            alert('Native button clicked!');
            console.log('Native button clicked!');
        }} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
            Test Native Button
          </button>
        </div>
      </div>

      {loading && (<card_1.Card>
          <card_1.CardContent className="p-6">
            <p className="text-center">Loading...</p>
          </card_1.CardContent>
        </card_1.Card>)}

      {error && (<card_1.Card className="border-red-200 bg-red-50">
          <card_1.CardHeader>
            <card_1.CardTitle className="text-red-700">Error</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <pre className="text-sm text-red-600 whitespace-pre-wrap">{error}</pre>
          </card_1.CardContent>
        </card_1.Card>)}

      {apiResponse && (<card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>API Response</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <pre className="text-sm whitespace-pre-wrap overflow-x-auto">
              {JSON.stringify(apiResponse, null, 2)}
            </pre>
          </card_1.CardContent>
        </card_1.Card>)}

      <card_1.Card className="mt-6">
        <card_1.CardHeader>
          <card_1.CardTitle>Debug Information</card_1.CardTitle>
        </card_1.CardHeader>
        <card_1.CardContent className="space-y-2">
          <p><strong>Current Time:</strong> {new Date().toISOString()}</p>
          <p><strong>Browser:</strong> {typeof window !== 'undefined' ? navigator.userAgent : 'Server-side'}</p>
          <p><strong>Page URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'Server-side'}</p>
          <p><strong>Component Mounted:</strong> {mounted ? '✓ Yes' : '✗ No'}</p>
          <p><strong>JavaScript Enabled:</strong> {typeof window !== 'undefined' ? '✓ Yes' : '✗ No'}</p>
          <p><strong>React Version:</strong> {react_1.useState ? '✓ React is loaded' : '✗ React not loaded'}</p>
        </card_1.CardContent>
      </card_1.Card>
      
      {/* Inline script test */}
      <script dangerouslySetInnerHTML={{
            __html: `
          console.log('=== Inline script executed ===');
          document.addEventListener('DOMContentLoaded', function() {
            console.log('DOM loaded');
            const testBtn = document.querySelector('button');
            if (testBtn) {
              console.log('Found button:', testBtn.textContent);
            } else {
              console.log('No button found');
            }
          });
        `
        }}/>
    </div>);
}
