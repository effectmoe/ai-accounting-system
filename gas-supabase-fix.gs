// Supabaseへの保存（修正版）
function saveToSupabase(data) {
  Logger.log('=== saveToSupabase開始 ===');
  Logger.log('保存データ: ' + JSON.stringify(data));
  
  try {
    const url = `${SUPABASE_URL}/rest/v1/ocr_results`;
    
    const options = {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=representation'  // ← これを追加
      },
      payload: JSON.stringify(data),
      muteHttpExceptions: true
    };
    
    Logger.log('Supabase APIを呼び出します');
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    Logger.log('レスポンスコード: ' + responseCode);
    Logger.log('レスポンス内容: ' + responseText);
    
    if (responseCode === 201) {
      // 空のレスポンスの場合の処理を追加
      if (!responseText || responseText.trim() === '') {
        Logger.log('=== saveToSupabase成功（空のレスポンス） ===');
        return {
          success: true,
          data: { id: 'no-response-id' }
        };
      }
      
      try {
        const result = JSON.parse(responseText);
        Logger.log('=== saveToSupabase成功 ===');
        return {
          success: true,
          data: result[0] || result
        };
      } catch (parseError) {
        Logger.log('JSONパースエラーだが、201なので成功とみなす');
        return {
          success: true,
          data: { id: 'parse-error-but-created' }
        };
      }
    } else {
      Logger.log('=== saveToSupabaseエラー ===');
      return {
        success: false,
        error: `HTTP ${responseCode}: ${responseText}`
      };
    }
  } catch (error) {
    Logger.log('saveToSupabaseで例外: ' + error.toString());
    Logger.log('スタックトレース: ' + error.stack);
    return {
      success: false,
      error: error.toString()
    };
  }
}