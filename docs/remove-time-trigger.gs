// 既存の時間ベーストリガーを削除する関数
function removeTimeTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  let removed = 0;
  
  triggers.forEach(trigger => {
    const handlerFunction = trigger.getHandlerFunction();
    
    // checkNewFilesAndProcess関数のトリガーを削除
    if (handlerFunction === 'checkNewFilesAndProcess') {
      ScriptApp.deleteTrigger(trigger);
      console.log('削除したトリガー:', handlerFunction);
      removed++;
    }
  });
  
  console.log(`${removed}個の時間ベーストリガーを削除しました`);
  
  // 現在のトリガーを確認
  const remainingTriggers = ScriptApp.getProjectTriggers();
  console.log('残りのトリガー数:', remainingTriggers.length);
  
  remainingTriggers.forEach(trigger => {
    console.log('- 関数:', trigger.getHandlerFunction(), 
                'タイプ:', trigger.getEventType());
  });
}