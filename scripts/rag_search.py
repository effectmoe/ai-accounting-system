#!/usr/bin/env python3
"""
RAG検索スクリプト
TypeScriptから呼び出されて、領収書の類似検索を行う
"""

import json
import sys
from pathlib import Path

# プロジェクトルートを取得
PROJECT_ROOT = Path(__file__).parent.parent
CHROMA_DB_PATH = PROJECT_ROOT / "data" / "chroma_db"

# 類似度閾値
SIMILARITY_THRESHOLD = 0.85  # distance < 0.15 で類似とみなす

def search_similar_receipts(query_data: dict) -> dict:
    """
    類似領収書を検索

    Args:
        query_data: {
            "store_name": str,
            "item_description": str,
            "description": str,  # 但し書き
            "issue_date": str,
            "total_amount": float
        }

    Returns:
        {
            "success": bool,
            "category": str or None,
            "subject": str or None,  # 但し書き
            "similarity": float,
            "source": "rag" or "fallback",
            "error": str or None
        }
    """
    try:
        import chromadb
        from chromadb.config import Settings

        # ChromaDBクライアントを初期化
        client = chromadb.PersistentClient(
            path=str(CHROMA_DB_PATH),
            settings=Settings(anonymized_telemetry=False)
        )

        # コレクションを取得
        collection = client.get_collection("receipts_master")

        # 検索クエリを作成
        # 店舗名と品目を組み合わせて検索テキストを作成
        query_parts = []
        if query_data.get("store_name"):
            query_parts.append(query_data["store_name"])
        if query_data.get("item_description"):
            query_parts.append(query_data["item_description"])
        if query_data.get("description"):
            query_parts.append(query_data["description"])

        if not query_parts:
            return {
                "success": False,
                "category": None,
                "subject": None,
                "similarity": 0,
                "source": "fallback",
                "error": "検索クエリが空です"
            }

        query_text = " ".join(query_parts)

        # 類似検索を実行
        results = collection.query(
            query_texts=[query_text],
            n_results=3,
            include=["metadatas", "distances", "documents"]
        )

        # 結果がない場合
        if not results["ids"] or not results["ids"][0]:
            return {
                "success": True,
                "category": None,
                "subject": None,
                "similarity": 0,
                "source": "fallback",
                "error": None
            }

        # 最も類似度の高い結果を取得
        best_distance = results["distances"][0][0]
        best_similarity = 1 - best_distance  # distance -> similarity 変換
        best_metadata = results["metadatas"][0][0]

        # 類似度が閾値以上の場合
        if best_similarity >= SIMILARITY_THRESHOLD:
            return {
                "success": True,
                "category": best_metadata.get("category"),
                "subject": best_metadata.get("description"),  # 但し書き
                "similarity": round(best_similarity, 4),
                "source": "rag",
                "error": None,
                "matched_store": best_metadata.get("store_name"),
                "matched_item": best_metadata.get("item_description")
            }
        else:
            return {
                "success": True,
                "category": None,
                "subject": None,
                "similarity": round(best_similarity, 4),
                "source": "fallback",
                "error": None
            }

    except Exception as e:
        return {
            "success": False,
            "category": None,
            "subject": None,
            "similarity": 0,
            "source": "fallback",
            "error": str(e)
        }


def add_receipt_to_rag(receipt_data: dict) -> dict:
    """
    領収書データをRAGに追加

    Args:
        receipt_data: {
            "id": str,
            "store_name": str,
            "item_description": str,
            "description": str,  # 但し書き
            "issue_date": str,
            "total_amount": float,
            "category": str,
            "verified": bool
        }

    Returns:
        {
            "success": bool,
            "error": str or None
        }
    """
    try:
        import chromadb
        from chromadb.config import Settings

        # ChromaDBクライアントを初期化
        client = chromadb.PersistentClient(
            path=str(CHROMA_DB_PATH),
            settings=Settings(anonymized_telemetry=False)
        )

        # コレクションを取得
        collection = client.get_collection("receipts_master")

        # ドキュメントテキストを作成
        doc_parts = []
        if receipt_data.get("store_name"):
            doc_parts.append(receipt_data["store_name"])
        if receipt_data.get("item_description"):
            doc_parts.append(receipt_data["item_description"])
        if receipt_data.get("description"):
            doc_parts.append(receipt_data["description"])

        document = " ".join(doc_parts)

        # メタデータを作成
        metadata = {
            "store_name": receipt_data.get("store_name", ""),
            "item_description": receipt_data.get("item_description", ""),
            "description": receipt_data.get("description", ""),  # 但し書き
            "issue_date": receipt_data.get("issue_date", ""),
            "total_amount": receipt_data.get("total_amount", 0),
            "category": receipt_data.get("category", ""),
            "verified": receipt_data.get("verified", False)
        }

        # Upsert（存在すれば更新、なければ追加）
        collection.upsert(
            ids=[receipt_data["id"]],
            documents=[document],
            metadatas=[metadata]
        )

        return {"success": True, "error": None}

    except Exception as e:
        return {"success": False, "error": str(e)}


def main():
    """
    メイン関数
    コマンドライン引数からJSONを読み取り、処理結果をJSONで出力
    """
    if len(sys.argv) < 3:
        print(json.dumps({
            "success": False,
            "error": "Usage: python rag_search.py <action> <json_data>"
        }))
        sys.exit(1)

    action = sys.argv[1]
    json_data = sys.argv[2]

    try:
        data = json.loads(json_data)
    except json.JSONDecodeError as e:
        print(json.dumps({
            "success": False,
            "error": f"JSON解析エラー: {str(e)}"
        }))
        sys.exit(1)

    if action == "search":
        result = search_similar_receipts(data)
    elif action == "add":
        result = add_receipt_to_rag(data)
    else:
        result = {"success": False, "error": f"不明なアクション: {action}"}

    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
