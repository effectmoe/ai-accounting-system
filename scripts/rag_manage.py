#!/usr/bin/env python3
"""
RAG Database Management Script
ChromaDBのCRUD操作を提供
"""

import sys
import json
import chromadb
from pathlib import Path

# ChromaDB設定
CHROMA_PATH = Path(__file__).parent.parent / "data" / "chroma_db"
COLLECTION_NAME = "receipts_master"


def get_collection():
    """ChromaDBコレクションを取得"""
    client = chromadb.PersistentClient(str(CHROMA_PATH))
    return client.get_or_create_collection(name=COLLECTION_NAME)


def list_all():
    """全レコードを取得"""
    collection = get_collection()
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

    return {'success': True, 'records': records, 'total': len(records)}


def get_by_id(record_id: str):
    """IDでレコードを取得"""
    collection = get_collection()
    results = collection.get(
        ids=[record_id],
        include=['documents', 'metadatas']
    )

    if not results['ids']:
        return {'success': False, 'error': 'Record not found'}

    return {
        'success': True,
        'record': {
            'id': results['ids'][0],
            'document': results['documents'][0],
            'metadata': results['metadatas'][0]
        }
    }


def update_record(record_id: str, metadata: dict):
    """レコードを更新"""
    collection = get_collection()

    # 既存レコードを取得
    existing = collection.get(ids=[record_id], include=['metadatas'])
    if not existing['ids']:
        return {'success': False, 'error': 'Record not found'}

    # メタデータをマージ
    current_meta = existing['metadatas'][0]
    updated_meta = {**current_meta, **metadata}

    # ドキュメント（検索用テキスト）を再生成
    store_name = updated_meta.get('store_name', '')
    item_desc = updated_meta.get('item_description', '')
    description = updated_meta.get('description', '')
    new_document = f"{store_name} {item_desc} {description}".strip()

    # 更新実行
    collection.update(
        ids=[record_id],
        documents=[new_document],
        metadatas=[updated_meta]
    )

    return {
        'success': True,
        'record': {
            'id': record_id,
            'document': new_document,
            'metadata': updated_meta
        }
    }


def delete_record(record_id: str):
    """レコードを削除"""
    collection = get_collection()

    # 存在確認
    existing = collection.get(ids=[record_id])
    if not existing['ids']:
        return {'success': False, 'error': 'Record not found'}

    collection.delete(ids=[record_id])
    return {'success': True, 'deleted_id': record_id}


def main():
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'error': 'No action specified'}))
        sys.exit(1)

    action = sys.argv[1]

    try:
        if action == 'list':
            result = list_all()
        elif action == 'get':
            if len(sys.argv) < 3:
                result = {'success': False, 'error': 'Record ID required'}
            else:
                result = get_by_id(sys.argv[2])
        elif action == 'update':
            if len(sys.argv) < 4:
                result = {'success': False, 'error': 'Record ID and metadata required'}
            else:
                record_id = sys.argv[2]
                metadata = json.loads(sys.argv[3])
                result = update_record(record_id, metadata)
        elif action == 'delete':
            if len(sys.argv) < 3:
                result = {'success': False, 'error': 'Record ID required'}
            else:
                result = delete_record(sys.argv[2])
        else:
            result = {'success': False, 'error': f'Unknown action: {action}'}

        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({'success': False, 'error': str(e)}))
        sys.exit(1)


if __name__ == '__main__':
    main()
