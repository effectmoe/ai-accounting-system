export default function TestJS() {
  return (
    <>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">JavaScript Test Page</h1>
        <p className="mb-4">This is a server component. JavaScript status will be shown below:</p>
        
        <div id="js-status" className="p-4 bg-gray-100 rounded">
          <p className="text-red-600">JavaScript is NOT running</p>
        </div>
      </div>
      
      <script
        dangerouslySetInnerHTML={{
          __html: `
            // Immediate test
            console.log('Inline script executed!');
            
            // Update status when DOM is ready
            if (typeof window !== 'undefined') {
              const updateStatus = () => {
                const statusEl = document.getElementById('js-status');
                if (statusEl) {
                  statusEl.innerHTML = '<p class="text-green-600">JavaScript is running! ✓</p>';
                  console.log('JavaScript status updated');
                }
              };
              
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', updateStatus);
              } else {
                updateStatus();
              }
            }
          `,
        }}
      />
    </>
  );
}