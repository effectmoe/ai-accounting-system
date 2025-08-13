// 商品説明を取得するヘルパー関数
export function getItemDescription(item: any): string {
  if (item.description && item.description.toString().trim() !== '') {
    return item.description;
  } else if (item.productDescription && item.productDescription.toString().trim() !== '') {
    return item.productDescription;
  } else if (item.itemDescription && item.itemDescription.toString().trim() !== '') {
    return item.itemDescription;
  } else if (item.details && item.details.toString().trim() !== '') {
    return item.details;
  } else if (item.product && item.product.description && item.product.description.toString().trim() !== '') {
    return item.product.description;
  }
  return '';
}

// 商品備考を取得するヘルパー関数
export function getItemNotes(item: any): string {
  if (item.notes && item.notes.toString().trim() !== '') {
    return item.notes;
  } else if (item.itemNotes && item.itemNotes.toString().trim() !== '') {
    return item.itemNotes;
  }
  return '';
}