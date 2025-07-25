"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MinimalTestPage;
function MinimalTestPage() {
    return (<div>
      <h1>Minimal Test Page</h1>
      <button onClick={() => {
            alert('Button clicked!');
            console.log('Button clicked!');
        }}>
        Click Me
      </button>
      <p>Client-side: {typeof window !== 'undefined' ? 'Yes' : 'No'}</p>
    </div>);
}
