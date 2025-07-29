'use client';

import { useEffect } from 'react';

// IntercomのApp IDを定数として定義（必要に応じて環境変数から読み込む）
const INTERCOM_APP_ID = process.env.NEXT_PUBLIC_INTERCOM_APP_ID || 'YOUR_INTERCOM_APP_ID';

export default function ChatbotEmbed() {
  useEffect(() => {
    // App IDが設定されていない場合は何もしない
    if (!INTERCOM_APP_ID || INTERCOM_APP_ID === 'YOUR_INTERCOM_APP_ID') {
      console.warn('Intercom App ID is not configured. Please set NEXT_PUBLIC_INTERCOM_APP_ID environment variable.');
      return;
    }

    // Intercomスクリプトを動的に読み込む
    const script = document.createElement('script');
    script.innerHTML = `
      window.intercomSettings = {
        api_base: "https://api-iam.intercom.io",
        app_id: "${INTERCOM_APP_ID}"
      };
      
      (function(){
        var w=window;
        var ic=w.Intercom;
        if(typeof ic==="function"){
          ic('reattach_activator');
          ic('update',w.intercomSettings);
        }else{
          var d=document;
          var i=function(){i.c(arguments);};
          i.q=[];
          i.c=function(args){i.q.push(args);};
          w.Intercom=i;
          var l=function(){
            var s=d.createElement('script');
            s.type='text/javascript';
            s.async=true;
            s.src='https://widget.intercom.io/widget/${INTERCOM_APP_ID}';
            var x=d.getElementsByTagName('script')[0];
            x.parentNode.insertBefore(s,x);
          };
          if(document.readyState==='complete'){
            l();
          }else if(w.attachEvent){
            w.attachEvent('onload',l);
          }else{
            w.addEventListener('load',l,false);
          }
        }
      })();
    `;
    document.body.appendChild(script);

    // クリーンアップ
    return () => {
      if (window.Intercom) {
        window.Intercom('shutdown');
      }
      script.remove();
    };
  }, []);

  return null;
}

// TypeScript用の型定義
declare global {
  interface Window {
    Intercom: any;
    intercomSettings: {
      api_base: string;
      app_id: string;
    };
  }
}