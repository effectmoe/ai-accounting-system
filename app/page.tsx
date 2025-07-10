// import ChatInterface from './components/chat-interface';
// import StatusCards from './components/status-cards';
// import RecentTransactions from './components/recent-transactions';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Users, Package } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold mb-6">AAM会計システム</h1>
        
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Link href="/invoices/new">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">請求書作成</CardTitle>
                <Plus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">新しい請求書を作成</p>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/invoices">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">請求書一覧</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">請求書を管理</p>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/customers">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">顧客管理</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">顧客情報を管理</p>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/products">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">商品管理</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">商品情報を管理</p>
              </CardContent>
            </Card>
          </Link>
        </div>
        
        {/* Main Actions */}
        <Card>
          <CardHeader>
            <CardTitle>クイックスタート</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">請求書作成</h3>
              <p className="text-sm text-muted-foreground mb-3">
                AIアシスタントと会話しながら請求書を作成できます。
              </p>
              <Link href="/invoices/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  新規請求書作成
                </Button>
              </Link>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">最近の請求書</h3>
              <p className="text-sm text-muted-foreground mb-3">
                作成した請求書の一覧を確認できます。
              </p>
              <Link href="/invoices">
                <Button variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  請求書一覧へ
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}