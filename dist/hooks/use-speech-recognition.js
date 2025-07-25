"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSpeechRecognition = useSpeechRecognition;
const react_1 = require("react");
const logger_1 = require("@/lib/logger");
const defaultConfig = {
    continuous: true,
    interimResults: true,
    language: 'ja-JP',
    maxAlternatives: 1,
    speechTimeout: 12000, // デフォルト10秒 + 2秒延長
};
function useSpeechRecognition(config = {}) {
    const [isListening, setIsListening] = (0, react_1.useState)(false);
    const [transcript, setTranscript] = (0, react_1.useState)('');
    const [interimTranscript, setInterimTranscript] = (0, react_1.useState)('');
    const [error, setError] = (0, react_1.useState)(null);
    const [isSupported, setIsSupported] = (0, react_1.useState)(false);
    const recognitionRef = (0, react_1.useRef)(null);
    const finalTranscriptRef = (0, react_1.useRef)('');
    const autoRestartRef = (0, react_1.useRef)(true); // 自動再開フラグ
    const timeoutRef = (0, react_1.useRef)(null); // タイムアウト管理
    // Web Speech API サポート確認
    (0, react_1.useEffect)(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
            const supported = !!SpeechRecognitionConstructor;
            setIsSupported(supported);
            if (!supported) {
                logger_1.logger.warn('[SpeechRecognition] このブラウザはWeb Speech APIに対応していません');
                setError('お使いのブラウザは音声認識に対応していません。Chrome、Edge、Safariなどのモダンブラウザをお試しください。');
            }
            else {
                logger_1.logger.debug('[SpeechRecognition] Web Speech APIが利用可能です');
            }
        }
    }, []);
    // SpeechRecognition インスタンスの初期化
    const initializeRecognition = (0, react_1.useCallback)(() => {
        if (typeof window === 'undefined')
            return null;
        const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognitionConstructor) {
            setError('お使いのブラウザは音声認識に対応していません');
            return null;
        }
        const recognition = new SpeechRecognitionConstructor();
        const finalConfig = { ...defaultConfig, ...config };
        // 設定を適用
        recognition.continuous = finalConfig.continuous !== undefined ? finalConfig.continuous : true; // デフォルトをtrueに変更
        recognition.interimResults = finalConfig.interimResults !== undefined ? finalConfig.interimResults : true;
        recognition.lang = finalConfig.language || 'ja-JP';
        recognition.maxAlternatives = finalConfig.maxAlternatives || 1;
        // イベントハンドラーの設定
        recognition.onstart = () => {
            setIsListening(true);
            setError(null);
            logger_1.logger.debug('[SpeechRecognition] 音声認識を開始しました');
            logger_1.logger.debug('[SpeechRecognition] continuous設定:', recognition.continuous);
            logger_1.logger.debug('[SpeechRecognition] interimResults設定:', recognition.interimResults);
            // カスタムタイムアウトを設定
            const timeout = finalConfig.speechTimeout || 12000;
            timeoutRef.current = setTimeout(() => {
                logger_1.logger.debug(`[SpeechRecognition] タイムアウト（${timeout}ms）により音声認識を自動停止`);
                if (recognitionRef.current) {
                    recognitionRef.current.stop();
                }
            }, timeout);
        };
        recognition.onend = () => {
            logger_1.logger.debug('[SpeechRecognition] 音声認識を終了しました');
            logger_1.logger.debug('[SpeechRecognition] 終了時のfinalTranscript:', finalTranscriptRef.current);
            // タイムアウトタイマーをクリア
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            // 手動停止でない場合は状態を更新
            if (autoRestartRef.current) {
                setIsListening(false);
            }
            // 音声認識終了時にinterimTranscriptをクリア
            setInterimTranscript('');
        };
        recognition.onerror = (event) => {
            logger_1.logger.error('[SpeechRecognition] エラー:', event.error);
            logger_1.logger.error('[SpeechRecognition] エラーイベント詳細:', event);
            setIsListening(false);
            // タイムアウトタイマーをクリア
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            let errorMessage = '音声認識でエラーが発生しました';
            let errorDetail = '';
            switch (event.error) {
                case 'not-allowed':
                    errorMessage = 'マイクへのアクセスが拒否されました';
                    errorDetail = 'ブラウザのアドレスバー左上のマイクアイコンをクリックして許可してください。または、ブラウザの設定からマイクへのアクセスを許可してください。';
                    break;
                case 'no-speech':
                    errorMessage = '音声が検出されませんでした';
                    errorDetail = '静かな環境でマイクに近づいてもう一度お試しください。マイクが正しく動作しているか確認してください。';
                    break;
                case 'audio-capture':
                    errorMessage = 'マイクが見つかりません';
                    errorDetail = 'マイクが正しく接続されているか確認し、他のアプリケーションで使用されていないか確認してください。システム設定でマイクが有効になっているか確認してください。';
                    break;
                case 'network':
                    errorMessage = 'ネットワークエラーが発生しました';
                    errorDetail = 'インターネット接続を確認してください。ファイアウォールやプロキシの設定も確認してください。';
                    break;
                case 'aborted':
                    errorMessage = '音声認識が中止されました';
                    errorDetail = 'もう一度お試しください。';
                    break;
                case 'bad-grammar':
                    errorMessage = '音声認識の設定にエラーがあります';
                    errorDetail = 'システムエラーが発生しました。ページをリロードしてお試しください。';
                    break;
                case 'language-not-supported':
                    errorMessage = '指定された言語（日本語）はサポートされていません';
                    errorDetail = 'お使いのブラウザまたはシステムで日本語の音声認識がサポートされていない可能性があります。';
                    break;
                case 'service-not-allowed':
                    errorMessage = '音声認識サービスが利用できません';
                    errorDetail = 'HTTPS接続が必要です。HTTPSでアクセスするか、開発環境の場合はlocalhostを使用してください。';
                    break;
                default:
                    errorMessage = `音声認識エラー: ${event.error}`;
                    errorDetail = '不明なエラーが発生しました。ブラウザのコンソールで詳細を確認してください。';
            }
            const fullErrorMessage = errorDetail ? `${errorMessage}\n${errorDetail}` : errorMessage;
            setError(fullErrorMessage);
        };
        recognition.onresult = (event) => {
            let interimTranscriptText = '';
            let finalTranscriptText = finalTranscriptRef.current;
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                const transcriptText = result[0].transcript;
                if (result.isFinal) {
                    finalTranscriptText += transcriptText;
                    logger_1.logger.debug('[SpeechRecognition] 確定テキスト:', transcriptText);
                }
                else {
                    interimTranscriptText += transcriptText;
                    logger_1.logger.debug('[SpeechRecognition] 中間テキスト:', transcriptText);
                }
            }
            finalTranscriptRef.current = finalTranscriptText;
            setTranscript(finalTranscriptText);
            setInterimTranscript(interimTranscriptText);
        };
        recognition.onsoundstart = () => {
            logger_1.logger.debug('[SpeechRecognition] 音声検出開始');
        };
        recognition.onsoundend = () => {
            logger_1.logger.debug('[SpeechRecognition] 音声検出終了');
            logger_1.logger.debug('[SpeechRecognition] continuous設定:', recognition.continuous);
        };
        recognition.onspeechstart = () => {
            logger_1.logger.debug('[SpeechRecognition] 発話検出開始');
        };
        recognition.onspeechend = () => {
            logger_1.logger.debug('[SpeechRecognition] 発話検出終了');
        };
        recognition.onaudiostart = () => {
            logger_1.logger.debug('[SpeechRecognition] オーディオキャプチャ開始');
        };
        recognition.onaudioend = () => {
            logger_1.logger.debug('[SpeechRecognition] オーディオキャプチャ終了');
        };
        return recognition;
    }, [config]);
    // 音声認識開始
    const startListening = (0, react_1.useCallback)(async () => {
        if (!isSupported) {
            setError('お使いのブラウザは音声認識に対応していません');
            return;
        }
        // HTTPSチェック
        if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
            logger_1.logger.error('[SpeechRecognition] HTTPS接続が必要です');
            setError('音声認識を使用するにはHTTPS接続が必要です。HTTPSでアクセスするか、開発環境の場合はlocalhostを使用してください。');
            return;
        }
        if (isListening) {
            logger_1.logger.debug('[SpeechRecognition] 既に音声認識中です');
            return;
        }
        try {
            // マイクアクセス許可を明示的に要求
            logger_1.logger.debug('[SpeechRecognition] マイクアクセス許可を確認中...');
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    logger_1.logger.debug('[SpeechRecognition] マイクアクセス許可が取得できました');
                    // ストリームを即座に停止（音声認識APIが独自にマイクを制御するため）
                    stream.getTracks().forEach(track => track.stop());
                }
                catch (mediaError) {
                    logger_1.logger.error('[SpeechRecognition] マイクアクセスエラー:', mediaError);
                    const error = mediaError;
                    let errorMessage = 'マイクへのアクセスに失敗しました';
                    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                        errorMessage = 'マイクへのアクセスが拒否されました。\nブラウザの設定でこのサイトのマイクアクセスを許可してください。';
                    }
                    else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                        errorMessage = 'マイクが見つかりません。\nマイクが正しく接続されているか確認してください。';
                    }
                    else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                        errorMessage = 'マイクにアクセスできません。\n他のアプリケーションがマイクを使用している可能性があります。';
                    }
                    else if (error.name === 'OverconstrainedError') {
                        errorMessage = 'マイクの設定に問題があります。\nシステム設定を確認してください。';
                    }
                    else if (error.name === 'SecurityError') {
                        errorMessage = 'セキュリティエラーが発生しました。\nHTTPS接続でアクセスしているか確認してください。';
                    }
                    setError(errorMessage);
                    return;
                }
            }
            // 音声認識開始前に前回の結果をクリア
            logger_1.logger.debug('[SpeechRecognition] 音声認識開始前にトランスクリプトをリセット');
            setTranscript('');
            setInterimTranscript('');
            finalTranscriptRef.current = '';
            setError(null);
            autoRestartRef.current = true; // 自動再開を有効に
            const recognition = initializeRecognition();
            if (recognition) {
                recognitionRef.current = recognition;
                recognition.start();
            }
        }
        catch (err) {
            logger_1.logger.error('[SpeechRecognition] 開始エラー:', err);
            const error = err;
            let detailedError = '音声認識の開始に失敗しました';
            if (error.name === 'NotAllowedError') {
                detailedError += '\nマイクへのアクセスが拒否されました。ブラウザの設定を確認してください。';
            }
            else if (error.name === 'NotFoundError') {
                detailedError += '\nマイクが見つかりません。デバイスが正しく接続されているか確認してください。';
            }
            else if (error.name === 'NotSupportedError') {
                detailedError += '\nお使いのブラウザまたはデバイスは音声認識に対応していません。';
            }
            else if (error.message) {
                detailedError += `\n詳細: ${error.message}`;
            }
            setError(detailedError);
            setIsListening(false);
        }
    }, [isSupported, isListening, initializeRecognition]);
    // 音声認識停止
    const stopListening = (0, react_1.useCallback)(() => {
        autoRestartRef.current = false; // 手動停止を記録
        // タイムアウトタイマーをクリア
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
        }
        setIsListening(false);
    }, [isListening]);
    // トランスクリプトリセット
    const resetTranscript = (0, react_1.useCallback)(() => {
        setTranscript('');
        setInterimTranscript('');
        finalTranscriptRef.current = '';
        setError(null);
    }, []);
    // クリーンアップ
    (0, react_1.useEffect)(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);
    return {
        isListening,
        transcript,
        interimTranscript,
        error,
        isSupported,
        startListening,
        stopListening,
        resetTranscript,
    };
}
