'use client';

import { useEffect, useState } from 'react';

export default function DebugConsolePage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    console.log('=== Debug Console Page Mounted ===');
    setMounted(true);

    // Check global objects
    const checkGlobals = () => {
      const globalChecks = [
        { name: 'window', exists: typeof window !== 'undefined' },
        { name: 'document', exists: typeof document !== 'undefined' },
        { name: 'React', exists: typeof (window as any)?.React !== 'undefined' },
        { name: 'ReactDOM', exists: typeof (window as any)?.ReactDOM !== 'undefined' },
        { name: '__NEXT_DATA__', exists: typeof (window as any)?.__NEXT_DATA__ !== 'undefined' },
      ];

      globalChecks.forEach(check => {
        const msg = `${check.name}: ${check.exists ? '✅ Available' : '❌ Not available'}`;
        console.log(msg);
        setLogs(prev => [...prev, msg]);
      });
    };

    // Check Next.js runtime
    const checkNextRuntime = () => {
      if (typeof window !== 'undefined' && (window as any).__NEXT_DATA__) {
        const nextData = (window as any).__NEXT_DATA__;
        const runtimeInfo = `Next.js buildId: ${nextData.buildId}, isPreview: ${nextData.isPreview}`;
        console.log(runtimeInfo);
        setLogs(prev => [...prev, runtimeInfo]);
      }
    };

    // Intercept console errors
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.error = (...args) => {
      setLogs(prev => [...prev, `❌ ERROR: ${args.join(' ')}`]);
      originalError(...args);
    };

    console.warn = (...args) => {
      setLogs(prev => [...prev, `⚠️ WARN: ${args.join(' ')}`]);
      originalWarn(...args);
    };

    // Run checks
    checkGlobals();
    checkNextRuntime();

    // Test event listener
    const testListener = () => {
      console.log('Test event listener triggered');
      setLogs(prev => [...prev, 'Test event listener triggered']);
    };

    document.addEventListener('DOMContentLoaded', testListener);

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      document.removeEventListener('DOMContentLoaded', testListener);
    };
  }, []);

  const handleTestClick = () => {
    console.log('Button clicked!');
    setLogs(prev => [...prev, `Button clicked at ${new Date().toLocaleTimeString()}`]);
    
    // Test synchronous code
    try {
      const result = 2 + 2;
      setLogs(prev => [...prev, `Sync calculation: 2 + 2 = ${result}`]);
    } catch (e) {
      setLogs(prev => [...prev, `Sync error: ${e}`]);
    }

    // Test async code
    setTimeout(() => {
      setLogs(prev => [...prev, 'Timeout executed after 100ms']);
    }, 100);
  };

  const handleForceError = () => {
    try {
      throw new Error('Forced error for testing');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Console Page</h1>
      
      <div className="mb-4 p-4 bg-blue-100 rounded">
        <p>Component mounted: {mounted ? '✅ Yes' : '❌ No'}</p>
        <p>JavaScript enabled: ✅ Yes (this text is rendered by JS)</p>
      </div>

      <div className="mb-4 space-x-2">
        <button
          onClick={handleTestClick}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Test Click
        </button>
        
        <button
          onClick={handleForceError}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Force Error
        </button>

        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Reload Page
        </button>
      </div>

      <div className="bg-black text-green-400 p-4 rounded font-mono text-sm overflow-auto max-h-96">
        <h2 className="text-white mb-2">Console Output:</h2>
        {logs.length === 0 ? (
          <p>No logs yet...</p>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="mb-1">
              [{index}] {log}
            </div>
          ))
        )}
      </div>

      <div className="mt-4 p-4 bg-gray-100 rounded">
        <h3 className="font-bold mb-2">Instructions:</h3>
        <ul className="list-disc list-inside text-sm">
          <li>If JavaScript is not working, you won\'t see any console output</li>
          <li>Click "Test Click" to verify event handlers are working</li>
          <li>Click "Force Error" to test error handling</li>
          <li>Check the browser\'s actual console for comparison</li>
        </ul>
      </div>
    </div>
  );
}