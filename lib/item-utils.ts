// 商品説明を取得するヘルパー関数
export function getItemDescription(item: any): string {
  // まず項目固有の説明を優先して取得
  if (item.description && item.description.toString().trim() !== '') {
    return item.description;
  } else if (item.productDescription && item.productDescription.toString().trim() !== '') {
    return item.productDescription;
  } else if (item.itemDescription && item.itemDescription.toString().trim() !== '') {
    return item.itemDescription;
  } else if (item.details && item.details.toString().trim() !== '') {
    return item.details;
  }
  // product.descriptionは商品マスタの説明なので、項目の備考と混同されないよう除外
  return '';
}

// 商品備考を取得するヘルパー関数
export function getItemNotes(item: any): string {
  // ハードコーディングされた不要な値をフィルタリング
  const excludeNotes = [
    '補足説明の備考欄',
    '※ 補足説明の備考欄',
    '優先席の購入順',
    '※ 優先席の購入順'
  ];
  
  if (item.notes && item.notes.toString().trim() !== '') {
    const notes = item.notes.toString().trim();
    if (!excludeNotes.includes(notes)) {
      return notes;
    }
  } else if (item.itemNotes && item.itemNotes.toString().trim() !== '') {
    const itemNotes = item.itemNotes.toString().trim();
    if (!excludeNotes.includes(itemNotes)) {
      return itemNotes;
    }
  }
  return '';
}