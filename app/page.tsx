import ChatInterface from './components/chat-interface';
import StatusCards from './components/status-cards';
import RecentTransactions from './components/recent-transactions';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Status Cards */}
        <div className="mb-6">
          <StatusCards />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Interface - Main Area */}
          <div className="lg:col-span-2">
            <ChatInterface />
          </div>

          {/* Recent Transactions - Sidebar */}
          <div className="lg:col-span-1">
            <RecentTransactions />
          </div>
        </div>
      </div>
    </main>
  );
}