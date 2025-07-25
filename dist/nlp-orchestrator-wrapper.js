"use strict";
// NLP Orchestrator Wrapper - Stub implementation
// This is a temporary stub to fix build errors
Object.defineProperty(exports, "__esModule", { value: true });
exports.processUserInput = processUserInput;
exports.analyzeSentiment = analyzeSentiment;
exports.extractEntities = extractEntities;
/**
 * Process user input with NLP
 */
async function processUserInput(input, context) {
    // Stub implementation - returns mock data
    console.log('NLP Orchestrator Wrapper - Processing input:', input);
    return {
        intent: 'unknown',
        entities: {},
        response: 'NLP処理は現在利用できません。',
        confidence: 0,
        suggestedActions: [],
    };
}
/**
 * Analyze text sentiment
 */
async function analyzeSentiment(text) {
    // Stub implementation
    return {
        sentiment: 'neutral',
        score: 0.5,
    };
}
/**
 * Extract entities from text
 */
async function extractEntities(text) {
    // Stub implementation
    return {};
}
