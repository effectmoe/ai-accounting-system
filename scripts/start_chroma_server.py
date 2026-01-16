#!/usr/bin/env python3
"""
ChromaDBサーバー起動スクリプト
TypeScript/JavaScriptクライアントからHTTP経由でアクセスするためのサーバー
"""

import os
import sys
from pathlib import Path

# プロジェクトルートを取得
PROJECT_ROOT = Path(__file__).parent.parent
CHROMA_DB_PATH = PROJECT_ROOT / "data" / "chroma_db"

def start_server():
    """ChromaDBサーバーを起動"""
    try:
        import chromadb
        from chromadb.config import Settings

        # ChromaDB永続化ディレクトリを確認
        if not CHROMA_DB_PATH.exists():
            print(f"❌ ChromaDBディレクトリが存在しません: {CHROMA_DB_PATH}")
            print("先に init_rag.py を実行してください")
            return False

        print(f"📁 ChromaDB保存先: {CHROMA_DB_PATH}")
        print("🚀 ChromaDBサーバーを起動中...")
        print("   ポート: 8000")
        print("   URL: http://localhost:8000")
        print("")
        print("Ctrl+C で停止")
        print("")

        # サーバーを起動
        import uvicorn
        from chromadb.app import create_app

        settings = Settings(
            chroma_db_impl="duckdb+parquet",
            persist_directory=str(CHROMA_DB_PATH),
            anonymized_telemetry=False
        )

        # ChromaDBサーバーを起動
        os.chdir(str(PROJECT_ROOT))
        os.system(f"chroma run --path {CHROMA_DB_PATH} --port 8000")

        return True

    except ImportError as e:
        print(f"❌ 必要なパッケージがインストールされていません: {e}")
        return False
    except Exception as e:
        print(f"❌ エラーが発生しました: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    start_server()
