#!/usr/bin/env python3
"""
RAG初期化スクリプト
ChromaDBコレクションを作成し、領収書分類用のRAGシステムを初期化する
"""

import os
import sys
from pathlib import Path

# プロジェクトルートを取得
PROJECT_ROOT = Path(__file__).parent.parent
CHROMA_DB_PATH = PROJECT_ROOT / "data" / "chroma_db"

def init_rag():
    """ChromaDBコレクションを初期化"""
    try:
        import chromadb
        from chromadb.config import Settings

        # ChromaDB永続化ディレクトリを作成
        CHROMA_DB_PATH.mkdir(parents=True, exist_ok=True)
        print(f"📁 ChromaDB保存先: {CHROMA_DB_PATH}")

        # PersistentClientで永続化モードで初期化
        client = chromadb.PersistentClient(
            path=str(CHROMA_DB_PATH),
            settings=Settings(anonymized_telemetry=False)
        )
        print("✅ ChromaDBクライアント初期化完了")

        # コレクション作成（または既存のものを取得）
        collection = client.get_or_create_collection(
            name="receipts_master",
            metadata={
                "hnsw:space": "cosine",  # コサイン類似度を使用
                "description": "領収書分類用RAGコレクション"
            }
        )
        print(f"✅ コレクション作成完了: {collection.name}")

        # コレクション情報を表示
        print("\n📊 コレクション情報:")
        print(f"  - 名前: {collection.name}")
        print(f"  - ドキュメント数: {collection.count()}")
        print(f"  - メタデータ: {collection.metadata}")

        # 全コレクション一覧を表示
        all_collections = client.list_collections()
        print(f"\n📋 全コレクション一覧 ({len(all_collections)}件):")
        for col in all_collections:
            print(f"  - {col.name}: {col.count()}件")

        print("\n✅ RAG初期化が正常に完了しました！")
        return True

    except ImportError as e:
        print(f"❌ 必要なパッケージがインストールされていません: {e}")
        print("以下のコマンドでインストールしてください:")
        print("  pip install chromadb sentence-transformers")
        return False
    except Exception as e:
        print(f"❌ エラーが発生しました: {e}")
        import traceback
        traceback.print_exc()
        return False


def show_config():
    """現在の設定を表示"""
    print("\n⚙️ RAG設定情報:")
    print(f"  - ChromaDB保存先: {CHROMA_DB_PATH}")
    print(f"  - コレクション名: receipts_master")
    print(f"  - 類似度計算: cosine similarity")
    print(f"  - 類似度閾値: 0.85 (distance < 0.15)")
    print(f"  - 埋め込みモデル: all-MiniLM-L6-v2 (384次元)")


if __name__ == "__main__":
    print("=" * 50)
    print("🚀 RAG初期化スクリプト - ai-accounting-system")
    print("=" * 50)

    show_config()
    print()

    success = init_rag()
    sys.exit(0 if success else 1)
