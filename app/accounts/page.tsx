import { createClient } from '@supabase/supabase-js';

// Supabase client initialization
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Account {
  id: string;
  code: string;
  name: string;
  name_kana: string | null;
  account_type: string;
  display_name: string | null;
  tax_category: string | null;
  balance: number;
  is_active: boolean;
}

export default async function AccountsPage() {
  // Fetch accounts from Supabase
  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('*')
    .order('code', { ascending: true });

  if (error) {
    console.error('Error fetching accounts:', error);
    return <div>Error loading accounts</div>;
  }

  // Group accounts by type
  const groupedAccounts = accounts?.reduce((acc, account) => {
    const type = account.account_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(account);
    return acc;
  }, {} as Record<string, Account[]>) || {};

  const typeLabels: Record<string, string> = {
    asset: '資産',
    liability: '負債',
    equity: '純資産',
    revenue: '収益',
    expense: '費用',
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">勘定科目一覧</h1>
      
      <div className="mb-4 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          合計: {accounts?.length || 0} 科目がインポートされています
        </p>
      </div>

      {Object.entries(groupedAccounts).map(([type, accountList]) => (
        <div key={type} className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">
            {typeLabels[type] || type} ({(accountList as Account[]).length}科目)
          </h2>
          
          <div className="bg-white shadow overflow-hidden rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    コード
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    科目名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    決算書表示名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    税区分
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    残高
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(accountList as Account[]).map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {account.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {account.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {account.display_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {account.tax_category || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      ¥{account.balance.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}