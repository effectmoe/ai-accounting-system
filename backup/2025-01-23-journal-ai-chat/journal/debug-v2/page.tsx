'use client';

import { useState, useEffect } from 'react';

export default function DebugV2Page() {
  const [logs, setLogs] = useState<string[]>([]);
  const [clickCount, setClickCount] = useState(0);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    setLogs(prev => [...prev, logMessage]);
  };

  useEffect(() => {
    addLog('Component mounted');
    addLog(`Window object exists: ${typeof window !== 'undefined'}`);
    addLog(`React version: ${useState ? 'Loaded' : 'Not loaded'}`);
    
    // Test if event listeners work
    const handleClick = () => addLog('Document click detected');
    document.addEventListener('click', handleClick);
    
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, []);

  const handleButtonClick = () => {
    addLog(`Button clicked! Count: ${clickCount + 1}`);
    setClickCount(clickCount + 1);
  };

  const testAPI = async () => {
    addLog('Starting API test...');
    setIsLoading(true);
    setApiResponse(null);

    try {
      const response = await fetch('/api/test-journals');
      addLog(`Response status: ${response.status}`);
      
      const data = await response.json();
      addLog('Response received successfully');
      
      setApiResponse(data);
    } catch (error) {
      addLog(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setApiResponse({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Debug Page V2</h1>
      
      {/* Test basic button functionality */}
      <div style={{ marginBottom: '20px' }}>
        <h2>Basic Button Test</h2>
        <button 
          onClick={handleButtonClick}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Click Counter: {clickCount}
        </button>
        
        <button 
          onClick={() => alert('Alert works!')}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Test Alert
        </button>
        
        <button 
          onClick={testAPI}
          disabled={isLoading}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: isLoading ? '#ccc' : '#FF9800',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? 'Loading...' : 'Test API'}
        </button>
      </div>

      {/* System Info */}
      <div style={{ marginBottom: '20px', backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '4px' }}>
        <h2>System Information</h2>
        <p>Client-side rendering: {typeof window !== 'undefined' ? '✓ Yes' : '✗ No'}</p>
        <p>JavaScript enabled: <noscript>✗ No</noscript><span>✓ Yes</span></p>
        <p>User Agent: {typeof window !== 'undefined' ? navigator.userAgent : 'N/A'}</p>
      </div>

      {/* API Response */}
      {apiResponse && (
        <div style={{ marginBottom: '20px', backgroundColor: '#e8f5e9', padding: '10px', borderRadius: '4px' }}>
          <h2>API Response</h2>
          <pre style={{ overflow: 'auto', maxHeight: '300px' }}>
            {JSON.stringify(apiResponse, null, 2)}
          </pre>
        </div>
      )}

      {/* Event Logs */}
      <div style={{ backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
        <h2>Event Logs</h2>
        <div style={{ 
          maxHeight: '200px', 
          overflow: 'auto', 
          backgroundColor: 'white', 
          padding: '10px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          fontFamily: 'monospace',
          fontSize: '12px'
        }}>
          {logs.length === 0 ? (
            <p>No logs yet...</p>
          ) : (
            logs.map((log, index) => (
              <div key={index}>{log}</div>
            ))
          )}
        </div>
      </div>

      {/* Direct DOM manipulation test */}
      <div style={{ marginTop: '20px' }}>
        <h2>Direct DOM Test</h2>
        <div id="dom-test" style={{ padding: '10px', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
          Click the button below to test direct DOM manipulation
        </div>
        <button 
          onClick={() => {
            const element = document.getElementById('dom-test');
            if (element) {
              element.textContent = `DOM updated at ${new Date().toLocaleTimeString()}`;
              element.style.backgroundColor = '#d4edda';
              addLog('DOM manipulation successful');
            }
          }}
          style={{
            marginTop: '10px',
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Update DOM
        </button>
      </div>
    </div>
  );
}