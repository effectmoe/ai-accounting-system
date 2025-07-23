'use client';

import { useState, useEffect } from 'react';

export default function SimpleDebugPage() {
  const [count, setCount] = useState(0);
  const [apiData, setApiData] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[${timestamp}] ${message}`);
  };

  useEffect(() => {
    addLog('Component mounted');
  }, []);

  const testAPI = async () => {
    addLog('Starting API test...');
    setError('');
    setApiData(null);

    try {
      const response = await fetch('/api/test-journals');
      addLog(`Response status: ${response.status}`);
      
      const data = await response.json();
      addLog('Response received');
      
      setApiData(data);
      
      if (!response.ok) {
        setError(`API error: ${response.status}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      addLog(`Error: ${errorMessage}`);
      setError(errorMessage);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Simple Debug Page</h1>
      
      <div style={{ marginTop: '20px' }}>
        <button 
          onClick={() => {
            setCount(count + 1);
            addLog(`Button clicked: ${count + 1}`);
          }}
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
          Count: {count}
        </button>

        <button 
          onClick={testAPI}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test API
        </button>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h2>Debug Info:</h2>
        <pre style={{ backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '4px' }}>
          Client-side: {typeof window !== 'undefined' ? 'Yes' : 'No'}
          React loaded: {useState ? 'Yes' : 'No'}
          Current time: {new Date().toLocaleTimeString()}
        </pre>
      </div>

      {error && (
        <div style={{ marginTop: '20px', color: 'red' }}>
          <h2>Error:</h2>
          <pre>{error}</pre>
        </div>
      )}

      {apiData && (
        <div style={{ marginTop: '20px' }}>
          <h2>API Response:</h2>
          <pre style={{ backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '4px', overflow: 'auto' }}>
            {JSON.stringify(apiData, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        <h2>Logs:</h2>
        <div style={{ backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '4px', maxHeight: '200px', overflow: 'auto' }}>
          {logs.map((log, index) => (
            <div key={index}>{log}</div>
          ))}
        </div>
      </div>
    </div>
  );
}