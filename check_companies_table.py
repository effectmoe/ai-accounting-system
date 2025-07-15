#!/usr/bin/env python3
"""
Supabaseのcompaniesテーブルを確認するスクリプト
"""

import os
from supabase import create_client
from dotenv import load_dotenv

# 環境変数を読み込み
load_dotenv()

# Supabase接続情報
SUPABASE_URL = 'https://clqpfmroqcnvyxdzadln.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNscXBmbXJvcWNudnl4ZHphZGxuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTY5Nzc0MSwiZXhwIjoyMDY3MjczNzQxfQ.n_FSZbe3xNSPGUVuWEXG4VohGQeCAe6tKAmAQbzX2LQ'

# Supabaseクライアントを作成
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

print(f"Supabase URL: {SUPABASE_URL}")
print("-" * 50)

try:
    # companiesテーブルの存在確認とデータ取得
    print("1. companiesテーブルの確認...")
    
    # 最初の10件のcompanyデータを取得
    response = supabase.table('companies').select("*").limit(10).execute()
    
    if response.data:
        print(f"\ncompaniesテーブルが存在します。")
        print(f"取得したレコード数: {len(response.data)}")
        print("\n既存のcompany_idのサンプル:")
        print("-" * 50)
        
        for i, company in enumerate(response.data[:5], 1):  # 最初の5件のみ表示
            print(f"{i}. ID: {company.get('id')}")
            print(f"   名前: {company.get('name', 'N/A')}")
            print(f"   作成日: {company.get('created_at', 'N/A')}")
            print()
        
        # デフォルトで使用できそうなcompany_idを特定
        print("\n推奨されるデフォルトcompany_id:")
        print("-" * 50)
        if response.data:
            default_company = response.data[0]
            print(f"ID: {default_company.get('id')}")
            print(f"名前: {default_company.get('name')}")
            
    else:
        print("\ncompaniesテーブルは存在しますが、データがありません。")
        print("新しいcompanyレコードを作成する必要があります。")
        
        # サンプルcompanyを作成
        print("\nサンプルcompanyを作成しています...")
        new_company = {
            'name': 'Sample Company',
            'description': 'デフォルトのサンプル会社'
        }
        
        create_response = supabase.table('companies').insert(new_company).execute()
        if create_response.data:
            created_company = create_response.data[0]
            print(f"\n新しいcompanyが作成されました:")
            print(f"ID: {created_company.get('id')}")
            print(f"名前: {created_company.get('name')}")
            
except Exception as e:
    print(f"\nエラーが発生しました: {str(e)}")
    print("\nテーブル構造の確認を試みます...")
    
    # エラーの場合、テーブル自体が存在しない可能性があるため、
    # データベースの情報を確認
    try:
        # 別のテーブルで接続テスト
        test_tables = ['users', 'profiles', 'companies']
        for table_name in test_tables:
            try:
                test_response = supabase.table(table_name).select("*").limit(1).execute()
                print(f"✓ {table_name}テーブルは存在します")
            except:
                print(f"✗ {table_name}テーブルは存在しないか、アクセスできません")
    except Exception as e2:
        print(f"データベース接続エラー: {str(e2)}")

print("\n" + "=" * 50)
print("確認完了")