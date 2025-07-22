'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DebugPage() {
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setApiResponse({
        error: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      });
    } finally {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Journal API Debug Page</h1>
      
      <div className="space-y-4 mb-6">
        <Button onClick={testJournalsAPI} disabled={loading}>
          Test /api/journals Endpoint
        </Button>
        
        <Button onClick={testSimpleJournalsAPI} disabled={loading} variant="outline">
          Test Simple Journals API
        </Button>
        
        <Button onClick={testMongoConnection} disabled={loading} variant="outline">
          Test MongoDB Connection
        </Button>
        
        <Button onClick={checkEnvironment} disabled={loading} variant="outline">
          Check Environment Variables
        </Button>
      </div>

      {loading && (
        <Card>
          <CardContent className="p-6">
            <p className="text-center">Loading...</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm text-red-600 whitespace-pre-wrap">{error}</pre>
          </CardContent>
        </Card>
      )}

      {apiResponse && (
        <Card>
          <CardHeader>
            <CardTitle>API Response</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm whitespace-pre-wrap overflow-x-auto">
              {JSON.stringify(apiResponse, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Debug Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><strong>Current Time:</strong> {new Date().toISOString()}</p>
          <p><strong>Browser:</strong> {typeof window !== 'undefined' ? navigator.userAgent : 'Server-side'}</p>
          <p><strong>Page URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'Server-side'}</p>
        </CardContent>
      </Card>
    </div>
  );
}