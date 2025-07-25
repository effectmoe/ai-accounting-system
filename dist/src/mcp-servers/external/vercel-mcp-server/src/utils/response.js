"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleResponse = handleResponse;
async function handleResponse(response) {
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }
    return response.json();
}
//# sourceMappingURL=response.js.map