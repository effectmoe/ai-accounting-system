export async function register() {
  // OpenTelemetry instrumentation is disabled
  // to avoid conflicts with Vercel build
  
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side instrumentation
    console.log('Server instrumentation disabled for Vercel compatibility');
  }
}