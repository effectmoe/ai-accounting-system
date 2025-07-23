'use client';

import { useState } from 'react';

export default function TestHydration() {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState('Initial state');

  const handleClick = () => {
    setCount(count + 1);
    setMessage(`Button clicked ${count + 1} times`);
    console.log('Button clicked!', count + 1);
  };

  // クライアントサイドでのみ実行されるコード
  if (typeof window !== 'undefined') {
    console.log('Running on client side!');
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Hydration Test Page</h1>
      
      <div className="space-y-4">
        <p className="text-lg">Count: {count}</p>
        <p className="text-lg">Message: {message}</p>
        
        <button
          onClick={handleClick}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Click me to test hydration
        </button>
        
        <div className="mt-8 p-4 bg-gray-100 rounded">
          <h2 className="font-semibold mb-2">Debug Info:</h2>
          <p>Client-side rendering: {typeof window !== 'undefined' ? '✓ Yes' : '✗ No'}</p>
          <p>JavaScript enabled: ✓ Yes (if you see this)</p>
        </div>
      </div>
    </div>
  );
}