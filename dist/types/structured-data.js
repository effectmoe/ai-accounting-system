"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCHEMA_DEFINITIONS = void 0;
// JSON Schema定義（検証用）
exports.SCHEMA_DEFINITIONS = {
    Invoice: {
        type: 'object',
        required: ['@context', '@type', 'identifier', 'customer', 'provider', 'paymentDueDate', 'totalPaymentDue'],
        properties: {
            '@context': { type: 'string', enum: ['https://schema.org'] },
            '@type': { type: 'string', enum: ['Invoice'] },
            identifier: { type: 'string', minLength: 1 },
            customer: { oneOf: [{ $ref: '#/definitions/Organization' }, { $ref: '#/definitions/Person' }] },
            provider: { $ref: '#/definitions/Organization' },
            paymentDueDate: { type: 'string', format: 'date' },
            totalPaymentDue: { $ref: '#/definitions/MonetaryAmount' },
            paymentStatus: {
                type: 'string',
                enum: ['PaymentPastDue', 'PaymentDue', 'PaymentComplete', 'PaymentAutomaticallyApplied']
            }
        }
    },
    FAQPage: {
        type: 'object',
        required: ['@context', '@type', 'mainEntity'],
        properties: {
            '@context': { type: 'string', enum: ['https://schema.org'] },
            '@type': { type: 'string', enum: ['FAQPage'] },
            mainEntity: {
                type: 'array',
                items: { $ref: '#/definitions/Question' },
                minItems: 1
            }
        }
    },
    Question: {
        type: 'object',
        required: ['@type', 'name', 'acceptedAnswer'],
        properties: {
            '@type': { type: 'string', enum: ['Question'] },
            name: { type: 'string', minLength: 1 },
            acceptedAnswer: { $ref: '#/definitions/Answer' }
        }
    },
    Answer: {
        type: 'object',
        required: ['@type', 'text'],
        properties: {
            '@type': { type: 'string', enum: ['Answer'] },
            text: { type: 'string', minLength: 1 }
        }
    },
    Organization: {
        type: 'object',
        required: ['@type', 'name'],
        properties: {
            '@type': { type: 'string', enum: ['Organization'] },
            name: { type: 'string', minLength: 1 },
            url: { type: 'string', format: 'uri' },
            email: { type: 'string', format: 'email' },
            telephone: { type: 'string' },
            address: { $ref: '#/definitions/PostalAddress' }
        }
    },
    Person: {
        type: 'object',
        required: ['@type', 'name'],
        properties: {
            '@type': { type: 'string', enum: ['Person'] },
            name: { type: 'string', minLength: 1 },
            email: { type: 'string', format: 'email' },
            telephone: { type: 'string' },
            jobTitle: { type: 'string' }
        }
    },
    PostalAddress: {
        type: 'object',
        required: ['@type'],
        properties: {
            '@type': { type: 'string', enum: ['PostalAddress'] },
            streetAddress: { type: 'string' },
            addressLocality: { type: 'string' },
            addressRegion: { type: 'string' },
            postalCode: { type: 'string' },
            addressCountry: { type: 'string' }
        }
    },
    MonetaryAmount: {
        type: 'object',
        required: ['@type', 'currency', 'value'],
        properties: {
            '@type': { type: 'string', enum: ['MonetaryAmount'] },
            currency: { type: 'string', minLength: 3, maxLength: 3 },
            value: { type: 'number', minimum: 0 }
        }
    }
};
