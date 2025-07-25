"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TestMinimal;
function TestMinimal() {
    return (<div>
      <h1>Minimal Test</h1>
      <button onClick={() => alert('Clicked!')}>
        Click me
      </button>
    </div>);
}
