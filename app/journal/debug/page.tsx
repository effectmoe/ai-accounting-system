export default function DebugPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold">Debug Page</h1>
      <p>This is a simple debug page to test routing.</p>
      <p>Current time: {new Date().toISOString()}</p>
    </div>
  );
}