#!/usr/bin/env python3
"""
ChromaDBデータをJSONにエクスポート
MongoDB移行用
"""

import json
import chromadb
from pathlib import Path

# ChromaDB設定
CHROMA_PATH = Path(__file__).parent.parent / "data" / "chroma_db"
COLLECTION_NAME = "receipts_master"


def export_all():
    """全レコードをJSONとしてエクスポート"""
    try:
        client = chromadb.PersistentClient(str(CHROMA_PATH))
        collection = client.get_collection(name=COLLECTION_NAME)
    except Exception as e:
        # コレクションが存在しない場合
        return {"success": True, "records": [], "total": 0}

    results = collection.get(include=['documents', 'metadatas'])

    records = []
    for i, (id_, doc, meta) in enumerate(zip(
        results['ids'],
        results['documents'],
        results['metadatas']
    )):
        records.append({
            'id': id_,
            'document': doc,
            'metadata': meta
        })

    return {"success": True, "records": records, "total": len(records)}


if __name__ == '__main__':
    result = export_all()
    print(json.dumps(result, ensure_ascii=False, indent=2))
