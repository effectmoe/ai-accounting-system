import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusIcon, RefreshCwIcon, BookOpenCheck, Home } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/mongodb-client';
import { JournalPageClient } from './journal-page-client';

async function getJournals() {
  try {
    const journals = await db.find('journals', {}, {
      limit: 50,
      skip: 0,
      sort: { entryDate: -1, createdAt: -1 }
    });
    
    return {
      success: true,
      journals: journals || []
    };
  } catch (error) {
    console.error('Failed to fetch journals:', error);
    return {
      success: false,
      journals: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export default async function JournalPage() {
  const { success, journals, error } = await getJournals();

  if (!success || error) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-red-600 mb-4">
                エラーが発生しました: {error || 'Unknown error'}
              </p>
              <Link href="/journal">
                <Button>再試行</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <JournalPageClient initialJournals={journals} />;
}